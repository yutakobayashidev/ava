import { apply, decide, replay } from "@/objects/task/decider";
import { toTaskStatus } from "@/objects/task/task-status";
import type { Command } from "@/objects/task/types";
import { processTaskPolicyOutbox } from "@/projections/policyOutboxProcessor";
import { queuePolicyEvents } from "@/projections/taskPolicyOutbox";
import { projectTaskEvents } from "@/projections/taskSessionProjector";
import type { SubscriptionRepository, TaskQueryRepository } from "@/repos";
import { createEventStore } from "@/repos/event-store";
import { checkFreePlanLimit } from "@/services/subscriptionService";
import type { HonoEnv } from "@/types";
import type { Database } from "@ava/database/client";
import { ResultAsync } from "neverthrow";
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
// Command Executor
// ============================================================================

type TaskCommandExecutorDeps = {
  db: Database;
};

export const createTaskCommandExecutor = (deps: TaskCommandExecutorDeps) => {
  const eventStore = createEventStore(deps.db);

  return async (params: {
    streamId: string;
    workspace: HonoEnv["Variables"]["workspace"];
    user: HonoEnv["Variables"]["user"];
    command: Command;
  }) => {
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
        state.slackThread?.channel ?? workspace.notificationChannelId ?? null,
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
  };
};

export type TaskCommandExecutor = ReturnType<typeof createTaskCommandExecutor>;

// ============================================================================
// Workflow Functions
// ============================================================================

export const createStartTaskWorkflow = (
  subscriptionRepository: SubscriptionRepository,
  executeCommand: TaskCommandExecutor,
): StartTaskWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { issue, initialSummary } = params;

    return ResultAsync.fromPromise(
      (async () => {
        // プラン制限のチェック
        const limitError = await checkFreePlanLimit(
          user.id,
          subscriptionRepository,
        );
        if (limitError) {
          throw new Error(limitError);
        }

        const streamId = uuidv7();

        await executeCommand({
          streamId,
          workspace,
          user,
          command: {
            type: "StartTask",
            payload: {
              issue,
              initialSummary,
            },
          },
        });

        return {
          taskSessionId: streamId,
          status: "in_progress" as const,
          issuedAt: new Date(),
        };
      })(),
      (error) =>
        error instanceof Error ? error.message : "Failed to start task",
    );
  };
};

export const createUpdateTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): UpdateTaskWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, summary } = params;

    return ResultAsync.fromPromise(
      (async () => {
        const result = await executeCommand({
          streamId: taskSessionId,
          workspace,
          user,
          command: {
            type: "AddProgress",
            payload: { summary },
          },
        });

        const nextState = apply(result.state, result.events);

        return {
          taskSessionId: taskSessionId,
          updateId: result.persistedEvents[0].id,
          status: nextState.status,
          summary,
        };
      })(),
      (error) =>
        error instanceof Error ? error.message : "Failed to update task",
    );
  };
};

export const createCompleteTaskWorkflow = (
  taskRepository: TaskQueryRepository,
  executeCommand: TaskCommandExecutor,
): CompleteTaskWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, summary } = params;

    return ResultAsync.fromPromise(
      (async () => {
        const result = await executeCommand({
          streamId: taskSessionId,
          workspace,
          user,
          command: {
            type: "CompleteTask",
            payload: { summary },
          },
        });

        const unresolvedBlocks =
          (await taskRepository.getUnresolvedBlockReports(taskSessionId)) || [];

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
      })(),
      (error) =>
        error instanceof Error ? error.message : "Failed to complete task",
    );
  };
};

export const createReportBlockedWorkflow = (
  executeCommand: TaskCommandExecutor,
): ReportBlockedWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, reason } = params;

    return ResultAsync.fromPromise(
      (async () => {
        const result = await executeCommand({
          streamId: taskSessionId,
          workspace,
          user,
          command: {
            type: "ReportBlock",
            payload: { reason },
          },
        });

        const nextState = apply(result.state, result.events);

        return {
          taskSessionId: taskSessionId,
          blockReportId: result.persistedEvents[0].id,
          status: nextState.status,
          reason,
        };
      })(),
      (error) =>
        error instanceof Error
          ? error.message
          : "Failed to report blocked status",
    );
  };
};

export const createPauseTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): PauseTaskWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, reason } = params;

    return ResultAsync.fromPromise(
      (async () => {
        const result = await executeCommand({
          streamId: taskSessionId,
          workspace,
          user,
          command: {
            type: "PauseTask",
            payload: { reason },
          },
        });

        const nextState = apply(result.state, result.events);

        return {
          taskSessionId: taskSessionId,
          pauseReportId: result.persistedEvents[0].id,
          status: nextState.status,
          pausedAt: result.persistedEvents[0].createdAt,
        };
      })(),
      (error) =>
        error instanceof Error ? error.message : "Failed to pause task",
    );
  };
};

export const createResumeTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): ResumeTaskWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, summary } = params;

    return ResultAsync.fromPromise(
      (async () => {
        const result = await executeCommand({
          streamId: taskSessionId,
          workspace,
          user,
          command: {
            type: "ResumeTask",
            payload: { summary },
          },
        });

        const nextState = apply(result.state, result.events);

        return {
          taskSessionId: taskSessionId,
          status: nextState.status,
          resumedAt: result.persistedEvents[0].createdAt,
        };
      })(),
      (error) =>
        error instanceof Error ? error.message : "Failed to resume task",
    );
  };
};

export const createResolveBlockedWorkflow = (
  executeCommand: TaskCommandExecutor,
): ResolveBlockedWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, blockReportId } = params;

    return ResultAsync.fromPromise(
      (async () => {
        const result = await executeCommand({
          streamId: taskSessionId,
          workspace,
          user,
          command: {
            type: "ResolveBlock",
            payload: { blockId: blockReportId },
          },
        });

        const nextState = apply(result.state, result.events);

        return {
          taskSessionId: taskSessionId,
          blockReportId: blockReportId,
          status: nextState.status,
          resolvedAt: result.persistedEvents[0].createdAt,
        };
      })(),
      (error) =>
        error instanceof Error
          ? error.message
          : "Failed to resolve blocked status",
    );
  };
};

export const createCancelTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): CancelTaskWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, reason } = params;

    return ResultAsync.fromPromise(
      (async () => {
        const result = await executeCommand({
          streamId: taskSessionId,
          workspace,
          user,
          command: {
            type: "CancelTask",
            payload: { reason },
          },
        });

        const nextState = apply(result.state, result.events);

        return {
          taskSessionId,
          cancellationId: result.persistedEvents[0].id,
          status: nextState.status,
          cancelledAt: result.persistedEvents[0].createdAt,
        };
      })(),
      (error) =>
        error instanceof Error ? error.message : "Failed to cancel task",
    );
  };
};

export const createListTasksWorkflow = (
  taskRepository: TaskQueryRepository,
): ListTasksWorkflow => {
  return (command) => {
    const { workspace, user, params } = command;
    const { status, limit } = params;

    return ResultAsync.fromPromise(
      (async () => {
        const sessions = await taskRepository.listTaskSessions({
          userId: user.id,
          workspaceId: workspace.id,
          status: toTaskStatus(status),
          limit,
        });

        return {
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
        };
      })(),
      (error) =>
        error instanceof Error ? error.message : "Failed to list tasks",
    );
  };
};
