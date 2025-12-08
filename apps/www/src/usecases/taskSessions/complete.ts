import { apply } from "@/objects/task/decider";
import type { TaskQueryRepository } from "@/repos";
import { type TaskCommandExecutor } from "./commandExecutor";
import type {
  CompleteTaskCommand,
  CompleteTaskOutput,
  CompleteTaskSuccess,
} from "./interface";

type CompleteTaskWorkflow = (
  command: CompleteTaskCommand,
) => Promise<CompleteTaskOutput>;

export const createCompleteTaskWorkflow = (
  taskRepository: TaskQueryRepository,
  executeCommand: TaskCommandExecutor,
): CompleteTaskWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, summary } = params;

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

    const nextState = apply(result.state, result.events);

    const data: CompleteTaskSuccess = {
      taskSessionId: taskSessionId,
      completionId: result.persistedEvents[0].id,
      status: nextState.status,
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
