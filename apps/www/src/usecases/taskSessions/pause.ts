import { createTaskCommandExecutor } from "./commandExecutor";
import type { PauseTaskInput, PauseTaskOutput } from "./interface";

export const createPauseTask = (
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: PauseTaskInput): Promise<PauseTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason, rawContext } = params;

    const executeCommand = commandExecutorFactory;
    try {
      const result = await executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "PauseTask",
          payload: { reason, rawContext },
        },
      });

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          pauseReportId: result.persistedEvents[0]?.id ?? "",
          status: result.nextState.status,
          pausedAt: result.persistedEvents[0]?.createdAt ?? new Date(),
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
