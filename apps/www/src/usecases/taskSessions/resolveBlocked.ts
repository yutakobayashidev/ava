import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { ResolveBlockedInput, ResolveBlockedOutput } from "./interface";

export const createResolveBlocked = (
  taskRepository: TaskRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ResolveBlockedInput): Promise<ResolveBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, blockReportId } = params;

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
        type: "ResolveBlock",
        payload: { blockId: blockReportId },
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
        error: "ブロッキングの解決処理に失敗しました",
      };
    }

    // Slack 通知はポリシー outbox に委譲
    const slackNotification = {
      delivered: false,
      reason: "Delegated to policy outbox",
    } as const;

    return {
      success: true,
      data: {
        taskSessionId: session.id,
        blockReportId: blockReportId,
        status: session.status,
        resolvedAt: result.persistedEvents[0]?.createdAt ?? session.updatedAt,
        slackNotification,
      },
    };
  };
};
