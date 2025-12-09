import { DatabaseError } from "@/lib/db";
import { withSpanAsync } from "@/lib/otel";
import { apply, decide, replay } from "@/objects/task/decider";
import { toTaskStatus } from "@/objects/task/task-status";
import type { Command } from "@/objects/task/types";
import { processTaskPolicyOutbox } from "@/projections/policyOutboxProcessor";
import { queuePolicyEvents } from "@/projections/taskPolicyOutbox";
import { projectTaskEvents } from "@/projections/taskSessionProjector";
import type { SubscriptionRepository, TaskQueryRepository } from "@/repos";
import { createEventStore } from "@/repos/event-store";
import { checkFreePlanLimitResult } from "@/services/subscriptionService";
import type { HonoEnv } from "@/types";
import type { Database } from "@ava/database/client";
import { okAsync, ResultAsync } from "neverthrow";
import { uuidv7 } from "uuidv7";
import { PlanLimitError } from "./errors";
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
// Command Executor
// ============================================================================

type TaskCommandExecutorDeps = {
  db: Database;
};

export const createTaskCommandExecutor = (deps: TaskCommandExecutorDeps) => {
  const eventStore = createEventStore(deps.db);

  return (params: {
    streamId: string;
    workspace: HonoEnv["Variables"]["workspace"];
    user: HonoEnv["Variables"]["user"];
    command: Command;
  }): ResultAsync<
    {
      events: ReturnType<typeof decide>;
      persistedEvents: Awaited<
        ReturnType<ReturnType<typeof createEventStore>["append"]>
      >["persistedEvents"];
      state: ReturnType<typeof replay>;
      version: Awaited<
        ReturnType<ReturnType<typeof createEventStore>["append"]>
      >["newVersion"];
    },
    DatabaseError
  > => {
    return ResultAsync.fromPromise(
      (async () => {
        const { streamId, workspace, user, command } = params;
        const history = await eventStore.load(streamId);
        const state = replay(streamId, history);

        const newEvents = decide(state, command, new Date());
        const expectedVersion = history.length - 1;

        const appendResult = await eventStore.append(
          streamId,
          expectedVersion,
          newEvents,
        );

        await projectTaskEvents(deps.db, streamId, newEvents, {
          workspaceId: workspace.id,
          userId: user.id,
        });

        await queuePolicyEvents(deps.db, streamId, newEvents, {
          workspaceId: workspace.id,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            slackId: user.slackId,
          },
          channel:
            state.slackThread?.channel ??
            workspace.notificationChannelId ??
            null,
          threadTs: state.slackThread?.threadTs ?? null,
        });

        // 可能な限り即時に通知するため、アウトボックスをその場で処理する
        try {
          await processTaskPolicyOutbox(deps.db);
        } catch (err) {
          console.error("Failed to process task policy outbox", err);
        }

        return {
          events: newEvents,
          persistedEvents: appendResult.persistedEvents,
          state,
          version: appendResult.newVersion,
        };
      })(),
      (error) =>
        new DatabaseError(
          error instanceof Error ? error.message : "Failed to execute command",
          error,
        ),
    );
  };
};

export type TaskCommandExecutor = ReturnType<typeof createTaskCommandExecutor>;

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
  ): ResultAsync<ValidatedStartTask, PlanLimitError | DatabaseError> => {
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
  (executeCommand: TaskCommandExecutor) =>
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
  executeCommand: TaskCommandExecutor,
): StartTaskWorkflow => {
  return withSpanAsync(
    "startTask",
    (command) => {
      return okAsync(command)
        .andThen(validatePlanLimit(subscriptionRepository))
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

export const createUpdateTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): UpdateTaskWorkflow => {
  return withSpanAsync(
    "updateTask",
    (command) => {
      const { workspace, user, params } = command;
      const { taskSessionId, summary } = params;

      return executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "AddProgress",
          payload: { summary },
        },
      }).map((result) => {
        const nextState = apply(result.state, result.events);
        return {
          taskSessionId: taskSessionId,
          updateId: result.persistedEvents[0].id,
          status: nextState.status,
          summary,
        };
      });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].params.taskSessionId,
      }),
    },
  );
};

export const createCompleteTaskWorkflow = (
  taskRepository: TaskQueryRepository,
  executeCommand: TaskCommandExecutor,
): CompleteTaskWorkflow => {
  return withSpanAsync(
    "completeTask",
    (command) => {
      const { workspace, user, params } = command;
      const { taskSessionId, summary } = params;

      return executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "CompleteTask",
          payload: { summary },
        },
      })
        .andThen((result) =>
          taskRepository
            .getUnresolvedBlockReports(taskSessionId)
            .map((unresolvedBlocks) => ({ result, unresolvedBlocks })),
        )
        .map(({ result, unresolvedBlocks }) => {
          const nextState = apply(result.state, result.events);
          const data: CompleteTaskSuccess = {
            taskSessionId: taskSessionId,
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
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].params.taskSessionId,
      }),
    },
  );
};

export const createReportBlockedWorkflow = (
  executeCommand: TaskCommandExecutor,
): ReportBlockedWorkflow => {
  return withSpanAsync(
    "reportBlocked",
    (command) => {
      const { workspace, user, params } = command;
      const { taskSessionId, reason } = params;

      return executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "ReportBlock",
          payload: { reason },
        },
      }).map((result) => {
        const nextState = apply(result.state, result.events);
        return {
          taskSessionId: taskSessionId,
          blockReportId: result.persistedEvents[0].id,
          status: nextState.status,
          reason,
        };
      });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].params.taskSessionId,
      }),
    },
  );
};

export const createPauseTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): PauseTaskWorkflow => {
  return withSpanAsync(
    "pauseTask",
    (command) => {
      const { workspace, user, params } = command;
      const { taskSessionId, reason } = params;

      return executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "PauseTask",
          payload: { reason },
        },
      }).map((result) => {
        const nextState = apply(result.state, result.events);
        return {
          taskSessionId: taskSessionId,
          pauseReportId: result.persistedEvents[0].id,
          status: nextState.status,
          pausedAt: result.persistedEvents[0].createdAt,
        };
      });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].params.taskSessionId,
      }),
    },
  );
};

export const createResumeTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): ResumeTaskWorkflow => {
  return withSpanAsync(
    "resumeTask",
    (command) => {
      const { workspace, user, params } = command;
      const { taskSessionId, summary } = params;

      return executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "ResumeTask",
          payload: { summary },
        },
      }).map((result) => {
        const nextState = apply(result.state, result.events);
        return {
          taskSessionId: taskSessionId,
          status: nextState.status,
          resumedAt: result.persistedEvents[0].createdAt,
        };
      });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].params.taskSessionId,
      }),
    },
  );
};

export const createResolveBlockedWorkflow = (
  executeCommand: TaskCommandExecutor,
): ResolveBlockedWorkflow => {
  return withSpanAsync(
    "resolveBlocked",
    (command) => {
      const { workspace, user, params } = command;
      const { taskSessionId, blockReportId } = params;

      return executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "ResolveBlock",
          payload: { blockId: blockReportId },
        },
      }).map((result) => {
        const nextState = apply(result.state, result.events);
        return {
          taskSessionId: taskSessionId,
          blockReportId: blockReportId,
          status: nextState.status,
          resolvedAt: result.persistedEvents[0].createdAt,
        };
      });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].params.taskSessionId,
        "task.block.report.id": args[0].params.blockReportId,
      }),
    },
  );
};

export const createCancelTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): CancelTaskWorkflow => {
  return withSpanAsync(
    "cancelTask",
    (command) => {
      const { workspace, user, params } = command;
      const { taskSessionId, reason } = params;

      return executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "CancelTask",
          payload: { reason },
        },
      }).map((result) => {
        const nextState = apply(result.state, result.events);
        return {
          taskSessionId,
          cancellationId: result.persistedEvents[0].id,
          status: nextState.status,
          cancelledAt: result.persistedEvents[0].createdAt,
        };
      });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].params.taskSessionId,
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
            status: toTaskStatus(command.params.status),
            limit: command.params.limit,
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
