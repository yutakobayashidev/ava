import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createTaskRepository } from "@/repos";
import { createNotificationService } from "@/services/notificationService";
import { HonoEnv } from "@/types";

type ResumeTask = {
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

type ResumeTaskResult =
  | { success: true; data: string }
  | { success: false; error: string };

export const createResumeTask = (
  taskRepository: ReturnType<typeof createTaskRepository>,
  notificationService: ReturnType<typeof createNotificationService>,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: ResumeTask): Promise<ResumeTaskResult> => {
    const { taskSessionId, summary, rawContext } = params;

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

    // paused → in_progress への遷移を検証
    if (!isValidTransition(currentSession.status, "in_progress")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session } = await taskRepository.resumeTask({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      summary,
      rawContext: rawContext ?? {},
    });

    if (!session) {
      return {
        success: false,
        error: "タスクの再開処理に失敗しました",
      };
    }

    const slackNotification = await notificationService.notifyTaskResumed({
      session: {
        id: session.id,
        slackThreadTs: session.slackThreadTs,
        slackChannel: session.slackChannel,
      },
      summary,
    });

    const result = {
      task_session_id: session.id,
      status: session.status,
      resumed_at: session.updatedAt,
      slack_notification: slackNotification,
      message: "タスクを再開しました。",
    };

    return {
      success: true,
      data: JSON.stringify(result, null, 2),
    };
  };
};
