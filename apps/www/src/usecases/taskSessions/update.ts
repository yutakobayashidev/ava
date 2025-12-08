import { createTaskCommandExecutor } from "./commandExecutor";
import type { UpdateTaskInput, UpdateTaskOutput } from "./interface";

export const createUpdateTask = (
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: UpdateTaskInput): Promise<UpdateTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary, rawContext } = params;

    const executeCommand = commandExecutorFactory;
    try {
      const result = await executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "AddProgress",
          payload: { summary, rawContext },
        },
      });

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          updateId: result.persistedEvents[0].id,
          status: result.nextState.status,
          summary,
        },
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "タスクの更新に失敗しました",
      };
    }
  };
};
