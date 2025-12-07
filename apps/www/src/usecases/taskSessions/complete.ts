import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type {
  CompleteTaskInput,
  CompleteTaskOutput,
  CompleteTaskSuccess,
} from "./interface";

export const createCompleteTask = (
  taskRepository: TaskRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: CompleteTaskInput): Promise<CompleteTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary } = params;

    const currentSession = await taskRepository.findTaskSessionById(
      taskSessionId,
      workspace.id,
      user.id,
    );

    if (!currentSession) {
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
        type: "CompleteTask",
        payload: { summary },
      },
    });

    const unresolvedBlocks =
      (await taskRepository.getUnresolvedBlockReports(taskSessionId)) || [];

    const data: CompleteTaskSuccess = {
      taskSessionId: taskSessionId,
      completionId: result.persistedEvents[0]?.id ?? "",
      status: result.nextState.status,
    };

    if (unresolvedBlocks.length > 0) {
      data.unresolvedBlocks = unresolvedBlocks.map((block) => ({
        blockReportId: block.id,
        reason: block.reason,
        createdAt: block.createdAt,
      }));
    }

    return {
      success: true,
      data,
    };
  };
};
