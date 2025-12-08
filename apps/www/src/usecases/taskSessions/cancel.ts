import { apply } from "@/objects/task/decider";
import { type TaskCommandExecutor } from "./commandExecutor";
import type { CancelTaskCommand, CancelTaskOutput } from "./interface";

export type CancelTaskWorkflow = (
  command: CancelTaskCommand,
) => Promise<CancelTaskOutput>;

export const createCancelTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): CancelTaskWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, reason } = params;

    try {
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
        success: true,
        data: {
          taskSessionId,
          cancellationId: result.persistedEvents[0].id,
          status: nextState.status,
          cancelledAt: result.persistedEvents[0].createdAt,
        },
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "タスクの中止に失敗しました",
      };
    }
  };
};
