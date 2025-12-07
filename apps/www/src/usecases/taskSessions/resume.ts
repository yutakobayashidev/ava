import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { ResumeTaskInput, ResumeTaskOutput } from "./interface";

export const createResumeTask = (
  taskRepository: TaskRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ResumeTaskInput): Promise<ResumeTaskOutput> => {
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
        type: "ResumeTask",
        payload: { summary, rawContext },
      },
    });

    return {
      success: true,
      data: {
        taskSessionId: taskSessionId,
        status: result.nextState.status,
        resumedAt: result.persistedEvents[0].createdAt,
      },
    };
  };
};
