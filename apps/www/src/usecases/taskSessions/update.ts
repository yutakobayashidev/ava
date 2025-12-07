import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { UpdateTaskInput, UpdateTaskOutput } from "./interface";

export const createUpdateTask = (
  taskRepository: TaskRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: UpdateTaskInput): Promise<UpdateTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary, rawContext } = params;

    const existingSession = await taskRepository.findTaskSessionById(
      taskSessionId,
      workspace.id,
      user.id,
    );

    if (!existingSession) {
      return {
        success: false,
        error: "タスクセッションが見つかりません",
      };
    }

    const executeCommand = commandExecutorFactory;
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
        updateId: result.persistedEvents[0]?.id ?? "",
        status: result.nextState.status,
        summary,
      },
    };
  };
};
