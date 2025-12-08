import type { TaskQueryRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type {
  CompleteTaskInput,
  CompleteTaskOutput,
  CompleteTaskSuccess,
} from "./interface";

export const createCompleteTask = (
  taskRepository: TaskQueryRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: CompleteTaskInput): Promise<CompleteTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary } = params;

    const executeCommand = commandExecutorFactory;
    let result;
    try {
      result = await executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "CompleteTask",
          payload: { summary },
        },
      });
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "タスクの完了処理に失敗しました",
      };
    }

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
