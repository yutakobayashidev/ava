import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { ReportBlockedInput, ReportBlockedOutput } from "./interface";

export const createReportBlocked = (
  taskRepository: TaskRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ReportBlockedInput): Promise<ReportBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason, rawContext } = params;

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
        type: "ReportBlock",
        payload: { reason, rawContext },
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
        error: "ブロッキング情報の登録に失敗しました",
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
        blockReportId: result.persistedEvents[0]?.id ?? "",
        status: session.status,
        reason,
        slackNotification,
      },
    };
  };
};
