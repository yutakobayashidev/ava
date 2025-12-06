import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createTaskRepository } from "@/repos";
import { createNotificationService } from "@/services/notificationService";
import { HonoEnv } from "@/types";

type CompleteTask = {
  taskSessionId: string;
  summary: string;
};

type CompleteTaskResult =
  | { success: true; data: string }
  | { success: false; error: string };

export const createCompleteTask = (
  taskRepository: ReturnType<typeof createTaskRepository>,
  notificationService: ReturnType<typeof createNotificationService>,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: CompleteTask): Promise<CompleteTaskResult> => {
    const { taskSessionId, summary } = params;

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

    // → completed への遷移を検証
    if (!isValidTransition(currentSession.status, "completed")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → completed. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session, completedEvent, unresolvedBlocks } =
      await taskRepository.completeTask({
        taskSessionId: taskSessionId,
        workspaceId: workspace.id,
        userId: user.id,
        summary,
      });

    if (!session || !completedEvent) {
      return {
        success: false,
        error: "タスクの完了処理に失敗しました",
      };
    }

    const slackNotification = await notificationService.notifyTaskCompleted({
      session: {
        id: session.id,
        slackThreadTs: session.slackThreadTs,
        slackChannel: session.slackChannel,
      },
      summary,
    });

    const response: Record<string, unknown> = {
      task_session_id: session.id,
      completion_id: completedEvent.id,
      status: session.status,
      slack_notification: slackNotification,
      message: "完了報告を保存しました。",
    };

    if (unresolvedBlocks.length > 0) {
      response.unresolved_blocks = unresolvedBlocks.map((block) => ({
        block_report_id: block.id,
        reason: block.reason,
        created_at: block.createdAt,
      }));
      response.message =
        "完了報告を保存しました。未解決のブロッキングがあります。resolve_blockedツールで解決を報告してください。";
    }

    return {
      success: true,
      data: JSON.stringify(response, null, 2),
    };
  };
};
