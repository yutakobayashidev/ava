import { PaymentRequiredError } from "@/errors";
import { DatabaseError } from "@/lib/db";
import { withSpanAsync } from "@/lib/otel";
import { apply } from "@/objects/task/decider";
import { toTaskStatus } from "@/objects/task/task-status";
import type { Command } from "@/objects/task/types";
import { checkFreePlanLimitResult } from "@/policies/planLimit";
import type { SubscriptionRepository, TaskQueryRepository } from "@/repos";
import type { HonoEnv } from "@/types";
import { ok, okAsync, ResultAsync } from "neverthrow";
import { uuidv7 } from "uuidv7";
import type { UnloadedCommand } from "./executor/types";
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
  TaskExecuteWorkflow,
  UpdateTaskWorkflow,
} from "./interface";

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
    taskSessionId: string;
  };
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
  const streamId = uuidv7();
  return okAsync({
    ...params,
    kind: "prepared",
    input: {
      ...params.input,
      taskSessionId: streamId,
    },
  });
};

// ============================================================================
// Helper Functions: Command Construction
// ============================================================================

/**
 * ワークフローの入力とCommandからUnloadedCommandを作成する汎用ヘルパー
 */
const toUnloadedCommand = <TInput extends { taskSessionId: string }>(
  workflowCommand: {
    workspace: HonoEnv["Variables"]["workspace"];
    user: HonoEnv["Variables"]["user"];
    input: TInput;
  },
  command: Command,
): ResultAsync<UnloadedCommand, never> => {
  return okAsync({
    kind: "unloaded" as const,
    streamId: workflowCommand.input.taskSessionId,
    workspace: workflowCommand.workspace,
    user: workflowCommand.user,
    command,
  });
};

// ============================================================================
// Start Task: Workflow
// ============================================================================

export const createStartTaskWorkflow = (
  subscriptionRepository: SubscriptionRepository,
  executeCommand: TaskExecuteWorkflow,
): StartTaskWorkflow => {
  return withSpanAsync(
    "startTask",
    (command) => {
      return ok(command)
        .asyncAndThen(validatePlanLimit(subscriptionRepository))
        .andThen(generateStreamId)
        .andThen((params) =>
          toUnloadedCommand(params, {
            type: "StartTask",
            payload: {
              issue: params.input.issue,
              initialSummary: params.input.initialSummary,
            },
          }),
        )
        .andThen(executeCommand)
        .map((result) => ({
          taskSessionId: result.state.streamId,
          status: result.state.status,
          issuedAt: result.persistedEvents[0].createdAt,
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
  executeCommand: TaskExecuteWorkflow,
): UpdateTaskWorkflow => {
  return withSpanAsync(
    "updateTask",
    (command) => {
      return ok(command)
        .asyncAndThen((command) =>
          toUnloadedCommand(command, {
            type: "AddProgress",
            payload: { summary: command.input.summary },
          }),
        )
        .andThen(executeCommand)
        .map((result) => {
          const nextState = apply(result.state, result.events);
          return {
            taskSessionId: command.input.taskSessionId,
            updateId: result.persistedEvents[0].id,
            status: nextState.status,
            summary: command.input.summary,
          };
        });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

export const createCompleteTaskWorkflow = (
  taskRepository: TaskQueryRepository,
  executeCommand: TaskExecuteWorkflow,
): CompleteTaskWorkflow => {
  return withSpanAsync(
    "completeTask",
    (command) => {
      return ok(command)
        .asyncAndThen((command) =>
          toUnloadedCommand(command, {
            type: "CompleteTask",
            payload: { summary: command.input.summary },
          }),
        )
        .andThen(executeCommand)
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
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

export const createReportBlockedWorkflow = (
  executeCommand: TaskExecuteWorkflow,
): ReportBlockedWorkflow => {
  return withSpanAsync(
    "reportBlocked",
    (command) => {
      return ok(command)
        .asyncAndThen((command) =>
          toUnloadedCommand(command, {
            type: "ReportBlock",
            payload: { reason: command.input.reason },
          }),
        )
        .andThen(executeCommand)
        .map((result) => {
          const nextState = apply(result.state, result.events);
          return {
            taskSessionId: command.input.taskSessionId,
            blockReportId: result.persistedEvents[0].id,
            status: nextState.status,
            reason: command.input.reason,
          };
        });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

export const createPauseTaskWorkflow = (
  executeCommand: TaskExecuteWorkflow,
): PauseTaskWorkflow => {
  return withSpanAsync(
    "pauseTask",
    (command) => {
      return ok(command)
        .asyncAndThen((command) =>
          toUnloadedCommand(command, {
            type: "PauseTask",
            payload: { reason: command.input.reason },
          }),
        )
        .andThen(executeCommand)
        .map((result) => {
          const nextState = apply(result.state, result.events);
          return {
            taskSessionId: command.input.taskSessionId,
            pauseReportId: result.persistedEvents[0].id,
            status: nextState.status,
            pausedAt: result.persistedEvents[0].createdAt,
          };
        });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

export const createResumeTaskWorkflow = (
  executeCommand: TaskExecuteWorkflow,
): ResumeTaskWorkflow => {
  return withSpanAsync(
    "resumeTask",
    (command) => {
      return ok(command)
        .asyncAndThen((command) =>
          toUnloadedCommand(command, {
            type: "ResumeTask",
            payload: { summary: command.input.summary },
          }),
        )
        .andThen(executeCommand)
        .map((result) => {
          const nextState = apply(result.state, result.events);
          return {
            taskSessionId: command.input.taskSessionId,
            status: nextState.status,
            resumedAt: result.persistedEvents[0].createdAt,
          };
        });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};

export const createResolveBlockedWorkflow = (
  executeCommand: TaskExecuteWorkflow,
): ResolveBlockedWorkflow => {
  return withSpanAsync(
    "resolveBlocked",
    (command) => {
      return ok(command)
        .asyncAndThen((command) =>
          toUnloadedCommand(command, {
            type: "ResolveBlock",
            payload: { blockId: command.input.blockReportId },
          }),
        )
        .andThen(executeCommand)
        .map((result) => {
          const nextState = apply(result.state, result.events);
          return {
            taskSessionId: command.input.taskSessionId,
            blockReportId: command.input.blockReportId,
            status: nextState.status,
            resolvedAt: result.persistedEvents[0].createdAt,
          };
        });
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
        "task.block.report.id": args[0].input.blockReportId,
      }),
    },
  );
};

export const createCancelTaskWorkflow = (
  executeCommand: TaskExecuteWorkflow,
): CancelTaskWorkflow => {
  return withSpanAsync(
    "cancelTask",
    (command) => {
      return ok(command)
        .asyncAndThen((command) =>
          toUnloadedCommand(command, {
            type: "CancelTask",
            payload: { reason: command.input.reason },
          }),
        )
        .andThen(executeCommand)
        .map((result) => {
          const nextState = apply(result.state, result.events);
          return {
            taskSessionId: command.input.taskSessionId,
            cancellationId: result.persistedEvents[0].id,
            status: nextState.status,
            cancelledAt: result.persistedEvents[0].createdAt,
          };
        });
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
      return ok(command)
        .asyncAndThen((command) =>
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
