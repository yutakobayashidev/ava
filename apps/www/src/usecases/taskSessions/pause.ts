import { createTaskCommandExecutor } from "./commandExecutor";
import { apply } from "@/objects/task/decider";
import type { PauseTaskInput, PauseTaskOutput } from "./interface";

export const createPauseTask = (
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: PauseTaskInput): Promise<PauseTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason } = params;

    const executeCommand = commandExecutorFactory;
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
        error:
          err instanceof Error ? err.message : "タスクの一時休止に失敗しました",
      };
    }
  };
};
