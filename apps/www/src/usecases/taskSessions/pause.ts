import { apply } from "@/objects/task/decider";
import { type TaskCommandExecutor } from "./commandExecutor";
import type { PauseTaskCommand, PauseTaskOutput } from "./interface";

type PauseTaskWorkflow = (
  command: PauseTaskCommand,
) => Promise<PauseTaskOutput>;

export const createPauseTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): PauseTaskWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, reason } = params;

    try {
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
        success: true,
        data: {
          taskSessionId: taskSessionId,
          pauseReportId: result.persistedEvents[0].id,
          status: nextState.status,
          pausedAt: result.persistedEvents[0].createdAt,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to pause task",
      };
    }
  };
};
