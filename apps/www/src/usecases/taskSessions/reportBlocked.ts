import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createTaskRepository } from "@/repos";
import { createNotificationService } from "@/services/notificationService";
import { HonoEnv } from "@/types";

type ReportBlocked = {
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

type ReportBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  reason: string | null;
  slackNotification: {
    delivered: boolean;
    reason?: string;
  };
};

type ReportBlockedResult =
  | { success: true; data: ReportBlockedSuccess }
  | { success: false; error: string };

export const createReportBlocked = (
  taskRepository: ReturnType<typeof createTaskRepository>,
  notificationService: ReturnType<typeof createNotificationService>,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: ReportBlocked): Promise<ReportBlockedResult> => {
    const { taskSessionId, reason, rawContext } = params;

    // 現在のタスクセッションを取得して状態遷移を検証
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

    // → blocked への遷移を検証
    if (!isValidTransition(currentSession.status, "blocked")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → blocked. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session, blockReport } = await taskRepository.reportBlock({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      reason,
      rawContext: rawContext ?? {},
    });

    if (!session || !blockReport) {
      return {
        success: false,
        error: "ブロッキング情報の登録に失敗しました",
      };
    }

    const slackNotification = await notificationService.notifyTaskBlocked({
      session: {
        id: session.id,
        slackThreadTs: session.slackThreadTs,
        slackChannel: session.slackChannel,
      },
      reason,
      blockReportId: blockReport.id,
    });

    return {
      success: true,
      data: {
        taskSessionId: session.id,
        blockReportId: blockReport.id,
        status: session.status,
        reason: blockReport.reason,
        slackNotification,
      },
    };
  };
};
