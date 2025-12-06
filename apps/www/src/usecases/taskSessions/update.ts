import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { TaskRepository } from "@/repos";
import { NotificationService } from "@/services/notificationService";
import { HonoEnv } from "@/types";

type UpdateTask = {
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

type UpdateTaskSuccess = {
  taskSessionId: string;
  updateId: string;
  status: string;
  summary: string | null;
  slackNotification: {
    delivered: boolean;
    reason?: string;
  };
};

type UpdateTaskResult =
  | { success: true; data: UpdateTaskSuccess }
  | { success: false; error: string };

export const createUpdateTask = (
  taskRepository: TaskRepository,
  notificationService: NotificationService,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: UpdateTask): Promise<UpdateTaskResult> => {
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

    // blocked/paused → in_progress への遷移を検証
    if (!isValidTransition(currentSession.status, "in_progress")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session, updateEvent } = await taskRepository.addTaskUpdate({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      summary,
      rawContext: rawContext ?? {},
    });

    if (!session || !updateEvent) {
      return {
        success: false,
        error: "タスクの更新に失敗しました",
      };
    }

    const slackNotification = await notificationService.notifyTaskUpdate({
      session: {
        id: session.id,
        slackThreadTs: session.slackThreadTs,
        slackChannel: session.slackChannel,
      },
      summary,
    });

    return {
      success: true,
      data: {
        taskSessionId: session.id,
        updateId: updateEvent.id,
        status: session.status,
        summary: updateEvent.summary,
        slackNotification,
      },
    };
  };
};
