import { BadRequestError, NotFoundError, PaymentRequiredError } from "@/errors";
import { DatabaseError } from "@/lib/db";
import { withSpanAsync } from "@/lib/otel";
import { apply, decide, replay } from "@/objects/task/decider";
import { toTaskStatus } from "@/objects/task/task-status";
import type { Command, Event } from "@/objects/task/types";
import { processTaskPolicyOutbox } from "@/projections/policyOutboxProcessor";
import { queuePolicyEvents } from "@/projections/taskPolicyOutbox";
import { projectTaskEvents } from "@/projections/taskSessionProjector";
import type { SubscriptionRepository, TaskQueryRepository } from "@/repos";
import { createEventStore } from "@/repos/event-store";
import { checkFreePlanLimitResult } from "@/policies/planLimit";
import type { HonoEnv } from "@/types";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { ok, okAsync, Result, ResultAsync } from "neverthrow";
import { uuidv7 } from "uuidv7";
import type {
  CancelTaskWorkflow,
  CompleteTaskSuccess,
  CompleteTaskWorkflow,
  ListTasksWorkflow,
  PauseTaskWorkflow,
  ReportBlockedWorkflow,
  ResolveBlockedWorkflow,
  ResumeTaskWorkflow,
  StartTaskWorkflow,
  UpdateTaskWorkflow,
} from "./interface";

// ============================================================================
// Command Executor: Pipeline Types
// ============================================================================

type UnloadedCommand = {
  kind: "unloaded";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  command: Command;
};

type LoadedCommand = {
  kind: "loaded";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  command: Command;
  history: Event[];
  state: ReturnType<typeof replay>;
};

type DecidedCommand = {
  kind: "decided";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  state: ReturnType<typeof replay>;
  newEvents: Event[];
  expectedVersion: number;
};

type CommittedCommand = {
  kind: "committed";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  state: ReturnType<typeof replay>;
  newEvents: Event[];
  persistedEvents: schema.TaskEvent[];
  version: number;
};

type ProjectedCommand = {
  kind: "projected";
  events: Event[];
  persistedEvents: schema.TaskEvent[];
  state: ReturnType<typeof replay>;
  version: number;
};

// ============================================================================
// Command Executor: Pipeline Functions
// ============================================================================

/**
 * Step 1: イベント履歴をロードして状態を再構築
 */
const loadEvents =
  (eventStore: ReturnType<typeof createEventStore>) =>
  (command: UnloadedCommand): ResultAsync<LoadedCommand, DatabaseError> => {
    return eventStore.load(command.streamId).map((history) => ({
      ...command,
      kind: "loaded",
      history,
      state: replay(command.streamId, history),
    }));
  };

/**
 * Step 2: コマンドから新しいイベントを決定
 */
const decideEvents = (
  command: LoadedCommand,
): Result<DecidedCommand, BadRequestError | NotFoundError> => {
  return decide(command.state, command.command, new Date()).map(
    (newEvents) => ({
      ...command,
      kind: "decided" as const,
      newEvents,
      expectedVersion: command.history.length - 1,
    }),
  );
};

/**
 * Step 3: イベントを永続化
 */
const commitEvents =
  (eventStore: ReturnType<typeof createEventStore>) =>
  (command: DecidedCommand): ResultAsync<CommittedCommand, DatabaseError> => {
    return eventStore
      .append(command.streamId, command.expectedVersion, command.newEvents)
      .map((appendResult) => ({
        ...command,
        kind: "committed" as const,
        persistedEvents: appendResult.persistedEvents,
        version: appendResult.newVersion,
      }));
  };

/**
 * Step 4: プロジェクションとポリシーイベントの処理
 */
const projectEvents =
  (db: Database) =>
  (command: CommittedCommand): ResultAsync<ProjectedCommand, DatabaseError> => {
    return ResultAsync.fromPromise(
      (async () => {
        await projectTaskEvents(db, command.streamId, command.newEvents, {
          workspaceId: command.workspace.id,
          userId: command.user.id,
        });

        await queuePolicyEvents(db, command.streamId, command.newEvents, {
          workspaceId: command.workspace.id,
          user: {
            id: command.user.id,
            name: command.user.name,
            email: command.user.email,
            slackId: command.user.slackId,
          },
          channel:
            command.state.slackThread?.channel ??
            command.workspace.notificationChannelId ??
            null,
          threadTs: command.state.slackThread?.threadTs ?? null,
        });

        // 可能な限り即時に通知するため、アウトボックスをその場で処理する
        try {
          await processTaskPolicyOutbox(db);
        } catch (err) {
          console.error("Failed to process task policy outbox", err);
        }

        return {
          kind: "projected" as const,
          events: command.newEvents,
          persistedEvents: command.persistedEvents,
          state: command.state,
          version: command.version,
        };
      })(),
      (error) =>
        new DatabaseError(
          error instanceof Error ? error.message : "Failed to project events",
          error,
        ),
    );
  };

// ============================================================================
// Command Executor
// ============================================================================

type TaskExecuteCommandDeps = {
  db: Database;
};

export const createTaskExecuteCommand = (deps: TaskExecuteCommandDeps) => {
  const eventStore = createEventStore(deps.db);

  return (params: {
    streamId: string;
    workspace: HonoEnv["Variables"]["workspace"];
    user: HonoEnv["Variables"]["user"];
    command: Command;
  }): ResultAsync<
    {
      events: Event[];
      persistedEvents: schema.TaskEvent[];
      state: ReturnType<typeof replay>;
      version: number;
    },
    DatabaseError | BadRequestError | NotFoundError
  > => {
    const command: UnloadedCommand = {
      kind: "unloaded",
      ...params,
    };

    return ok(command)
      .asyncAndThen(loadEvents(eventStore))
      .andThen(decideEvents)
      .andThen(commitEvents(eventStore))
      .andThen(projectEvents(deps.db))
      .map((result) => ({
        events: result.events,
        persistedEvents: result.persistedEvents,
        state: result.state,
        version: result.version,
      }));
  };
};

export type TaskExecuteCommand = ReturnType<typeof createTaskExecuteCommand>;

// ============================================================================
// Workflow Functions
// ============================================================================

// ============================================================================
// Start Task: Pipeline Types
// ============================================================================

type StartTaskInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  input: {
    issue: {
      provider: "github" | "manual";
      id?: string;
      title: string;
    };
    initialSummary: string;
  };
};

// StartTaskCommand と StartTaskInput は同じ構造
// StartTaskCommand は外部公開用、StartTaskInput は内部パイプライン用

type ValidatedStartTask = {
  kind: "validated";
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  input: {
    issue: {
      provider: "github" | "manual";
      id?: string;
      title: string;
    };
    initialSummary: string;
  };
};

type PreparedStartTask = {
  kind: "prepared";
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  input: {
    issue: {
      provider: "github" | "manual";
      id?: string;
      title: string;
    };
    initialSummary: string;
  };
  streamId: string;
};

type StartedTask = {
  kind: "started";
  taskSessionId: string;
  status: "in_progress";
  issuedAt: Date;
};

// ============================================================================
// Start Task: Pipeline Functions
// ============================================================================

/**
 * Step 1: プラン制限のバリデーション
 */
const validatePlanLimit =
  (subscriptionRepository: SubscriptionRepository) =>
  (
    params: StartTaskInput,
  ): ResultAsync<ValidatedStartTask, PaymentRequiredError | DatabaseError> => {
    return checkFreePlanLimitResult(params.user.id, subscriptionRepository).map(
      () => ({
        ...params,
        kind: "validated" as const,
      }),
    );
  };

/**
 * Step 2: streamId生成
 */
const generateStreamId = (
  params: ValidatedStartTask,
): ResultAsync<PreparedStartTask, never> => {
  return okAsync({
    ...params,
    kind: "prepared",
    streamId: uuidv7(),
  });
};

/**
 * Step 3: コマンド実行
 */
const executeStartTask =
  (executeCommand: TaskExecuteCommand) =>
  (params: PreparedStartTask): ResultAsync<StartedTask, DatabaseError> => {
    return executeCommand({
      streamId: params.streamId,
      workspace: params.workspace,
      user: params.user,
      command: {
        type: "StartTask",
        payload: {
          issue: params.input.issue,
          initialSummary: params.input.initialSummary,
        },
      },
    }).map(() => ({
      kind: "started" as const,
      taskSessionId: params.streamId,
      status: "in_progress" as const,
      issuedAt: new Date(),
    }));
  };

// ============================================================================
// Start Task: Workflow
// ============================================================================

export const createStartTaskWorkflow = (
  subscriptionRepository: SubscriptionRepository,
  executeCommand: TaskExecuteCommand,
): StartTaskWorkflow => {
  return withSpanAsync(
    "startTask",
    (command) => {
      return ok(command)
        .asyncAndThen(validatePlanLimit(subscriptionRepository))
        .andThen(generateStreamId)
        .andThen(executeStartTask(executeCommand))
        .map((result) => ({
          taskSessionId: result.taskSessionId,
          status: result.status,
          issuedAt: result.issuedAt,
        }));
    },
    {
      spanAttrs: (args) => ({
        "task.issue.provider": args[0].input.issue.provider,
        "task.issue.title": args[0].input.issue.title,
      }),
    },
  );
};

const executeUpdateTask =
  (executeCommand: TaskExecuteCommand) =>
  (command: Parameters<UpdateTaskWorkflow>[0]) => {
    return executeCommand({
      streamId: command.input.taskSessionId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "AddProgress",
        payload: { summary: command.input.summary },
      },
    }).map((result) => {
      const nextState = apply(result.state, result.events);
      return {
        taskSessionId: command.input.taskSessionId,
        updateId: result.persistedEvents[0].id,
        status: nextState.status,
        summary: command.input.summary,
      };
    });
  };

export const createUpdateTaskWorkflow = (
  executeCommand: TaskExecuteCommand,
): UpdateTaskWorkflow => {
  return withSpanAsync(
    "updateTask",
    (command) => {
      return ok(command).asyncAndThen(executeUpdateTask(executeCommand));
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

const executeCompleteTask =
  (executeCommand: TaskExecuteCommand, taskRepository: TaskQueryRepository) =>
  (command: Parameters<CompleteTaskWorkflow>[0]) => {
    return executeCommand({
      streamId: command.input.taskSessionId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "CompleteTask",
        payload: { summary: command.input.summary },
      },
    })
      .andThen((result) =>
        taskRepository
          .getUnresolvedBlockReports(command.input.taskSessionId)
          .map((unresolvedBlocks) => ({ result, unresolvedBlocks })),
      )
      .map(({ result, unresolvedBlocks }) => {
        const nextState = apply(result.state, result.events);
        const data: CompleteTaskSuccess = {
          taskSessionId: command.input.taskSessionId,
          completionId: result.persistedEvents[0].id,
          status: nextState.status,
        };

        if (unresolvedBlocks.length > 0) {
          data.unresolvedBlocks = unresolvedBlocks.map((block) => ({
            blockReportId: block.id,
            reason: block.reason,
            createdAt: block.createdAt,
          }));
        }

        return data;
      });
  };

export const createCompleteTaskWorkflow = (
  taskRepository: TaskQueryRepository,
  executeCommand: TaskExecuteCommand,
): CompleteTaskWorkflow => {
  return withSpanAsync(
    "completeTask",
    (command) => {
      return ok(command).asyncAndThen(
        executeCompleteTask(executeCommand, taskRepository),
      );
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

const executeReportBlocked =
  (executeCommand: TaskExecuteCommand) =>
  (command: Parameters<ReportBlockedWorkflow>[0]) => {
    return executeCommand({
      streamId: command.input.taskSessionId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "ReportBlock",
        payload: { reason: command.input.reason },
      },
    }).map((result) => {
      const nextState = apply(result.state, result.events);
      return {
        taskSessionId: command.input.taskSessionId,
        blockReportId: result.persistedEvents[0].id,
        status: nextState.status,
        reason: command.input.reason,
      };
    });
  };

export const createReportBlockedWorkflow = (
  executeCommand: TaskExecuteCommand,
): ReportBlockedWorkflow => {
  return withSpanAsync(
    "reportBlocked",
    (command) => {
      return ok(command).asyncAndThen(executeReportBlocked(executeCommand));
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

const executePauseTask =
  (executeCommand: TaskExecuteCommand) =>
  (command: Parameters<PauseTaskWorkflow>[0]) => {
    return executeCommand({
      streamId: command.input.taskSessionId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "PauseTask",
        payload: { reason: command.input.reason },
      },
    }).map((result) => {
      const nextState = apply(result.state, result.events);
      return {
        taskSessionId: command.input.taskSessionId,
        pauseReportId: result.persistedEvents[0].id,
        status: nextState.status,
        pausedAt: result.persistedEvents[0].createdAt,
      };
    });
  };

export const createPauseTaskWorkflow = (
  executeCommand: TaskExecuteCommand,
): PauseTaskWorkflow => {
  return withSpanAsync(
    "pauseTask",
    (command) => {
      return ok(command).asyncAndThen(executePauseTask(executeCommand));
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

const executeResumeTask =
  (executeCommand: TaskExecuteCommand) =>
  (command: Parameters<ResumeTaskWorkflow>[0]) => {
    return executeCommand({
      streamId: command.input.taskSessionId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "ResumeTask",
        payload: { summary: command.input.summary },
      },
    }).map((result) => {
      const nextState = apply(result.state, result.events);
      return {
        taskSessionId: command.input.taskSessionId,
        status: nextState.status,
        resumedAt: result.persistedEvents[0].createdAt,
      };
    });
  };

export const createResumeTaskWorkflow = (
  executeCommand: TaskExecuteCommand,
): ResumeTaskWorkflow => {
  return withSpanAsync(
    "resumeTask",
    (command) => {
      return ok(command).asyncAndThen(executeResumeTask(executeCommand));
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

const executeResolveBlocked =
  (executeCommand: TaskExecuteCommand) =>
  (command: Parameters<ResolveBlockedWorkflow>[0]) => {
    return executeCommand({
      streamId: command.input.taskSessionId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "ResolveBlock",
        payload: { blockId: command.input.blockReportId },
      },
    }).map((result) => {
      const nextState = apply(result.state, result.events);
      return {
        taskSessionId: command.input.taskSessionId,
        blockReportId: command.input.blockReportId,
        status: nextState.status,
        resolvedAt: result.persistedEvents[0].createdAt,
      };
    });
  };

export const createResolveBlockedWorkflow = (
  executeCommand: TaskExecuteCommand,
): ResolveBlockedWorkflow => {
  return withSpanAsync(
    "resolveBlocked",
    (command) => {
      return ok(command).asyncAndThen(executeResolveBlocked(executeCommand));
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
        "task.block.report.id": args[0].input.blockReportId,
      }),
    },
  );
};

const executeCancelTask =
  (executeCommand: TaskExecuteCommand) =>
  (command: Parameters<CancelTaskWorkflow>[0]) => {
    return executeCommand({
      streamId: command.input.taskSessionId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "CancelTask",
        payload: { reason: command.input.reason },
      },
    }).map((result) => {
      const nextState = apply(result.state, result.events);
      return {
        taskSessionId: command.input.taskSessionId,
        cancellationId: result.persistedEvents[0].id,
        status: nextState.status,
        cancelledAt: result.persistedEvents[0].createdAt,
      };
    });
  };

export const createCancelTaskWorkflow = (
  executeCommand: TaskExecuteCommand,
): CancelTaskWorkflow => {
  return withSpanAsync(
    "cancelTask",
    (command) => {
      return ok(command).asyncAndThen(executeCancelTask(executeCommand));
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

export const createListTasksWorkflow = (
  taskRepository: TaskQueryRepository,
): ListTasksWorkflow => {
  return withSpanAsync(
    "listTasks",
    (command) => {
      return okAsync(command)
        .andThen((command) =>
          taskRepository.listTaskSessions({
            userId: command.user.id,
            workspaceId: command.workspace.id,
            status: toTaskStatus(command.input.status),
            limit: command.input.limit,
          }),
        )
        .map((sessions) => ({
          total: sessions.length,
          tasks: sessions.map((session) => ({
            taskSessionId: session.id,
            issueProvider: session.issueProvider,
            issueId: session.issueId,
            issueTitle: session.issueTitle,
            status: session.status,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          })),
        }));
    },
    {
      spanAttrs: (args) => ({
        "user.id": args[0].user.id,
        "workspace.id": args[0].workspace.id,
      }),
    },
  );
};
