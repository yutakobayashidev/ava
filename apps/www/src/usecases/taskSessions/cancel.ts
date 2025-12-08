import { createTaskCommandExecutor } from "./commandExecutor";
import type { CancelTaskInput, CancelTaskOutput } from "./interface";

export const createCancelTask = (
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: CancelTaskInput): Promise<CancelTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason } = params;

    const executeCommand = commandExecutorFactory;
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

      return {
        success: true,
        data: {
          taskSessionId,
          cancellationId: result.persistedEvents[0]?.id ?? "",
          status: result.nextState.status,
          cancelledAt: result.persistedEvents[0]?.createdAt ?? new Date(),
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
