import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { createTaskEventRepository } from "@/repos/taskEvents";
import { validateTransition } from "@/domain/task-status";

export type CompleteTask = {
  task_session_id: string;
  summary: string;
};

export const completeTask = async (
  params: CompleteTask,
  ctx: Env["Variables"],
) => {
  const { task_session_id, summary } = params;

  const [workspace, db] = [ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });
  const taskEventRepository = createTaskEventRepository({ db });
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
  );

  // 現在のタスクセッションを取得して状態遷移を検証
  const currentSession = await taskRepository.findTaskSessionById(
    task_session_id,
    workspace.id,
  );

  if (!currentSession) {
    throw new Error("タスクセッションが見つかりません");
  }

  // → completed への遷移を検証
  validateTransition(currentSession.status, "completed");

  const { session, completion, unresolvedBlocks } =
    await taskRepository.completeTask({
      taskSessionId: task_session_id,
      workspaceId: workspace.id,
      summary,
    });

  // イベントログに保存
  await taskEventRepository.createEvent({
    taskSessionId: task_session_id,
    eventType: "completed",
    summary,
  });

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
    completion_id: completion.id,
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

  return response;
};
