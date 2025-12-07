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

    const session = await taskRepository.findTaskSessionById(
      taskSessionId,
      workspace.id,
      user.id,
    );

    if (!session) {
      return {
        success: false,
        error: "タスクの完了処理に失敗しました",
      };
    }

    // Slack 通知はポリシー outbox に委譲
    const slackNotification = {
      delivered: false,
      reason: "Delegated to policy outbox",
    } as const;

    const unresolvedBlocks =
      (await taskRepository.getUnresolvedBlockReports(taskSessionId)) || [];

    const data: CompleteTaskSuccess = {
      taskSessionId: session.id,
      completionId: result.persistedEvents[0]?.id ?? "",
      status: session.status,
      slackNotification,
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
