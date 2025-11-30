import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { createTaskEventRepository } from "@/repos/taskEvents";
import { validateTransition } from "@/domain/task-status";

export type ReportBlocked = {
  task_session_id: string;
  reason: string;
  raw_context?: Record<string, unknown>;
};

export const reportBlocked = async (
  params: ReportBlocked,
  ctx: Env["Variables"],
) => {
  const { task_session_id, reason, raw_context } = params;

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

  // → blocked への遷移を検証
  validateTransition(currentSession.status, "blocked");

  const { session, blockReport } = await taskRepository.reportBlock({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    reason,
    rawContext: raw_context ?? {},
  });

  // イベントログに保存
  await taskEventRepository.createEvent({
    taskSessionId: task_session_id,
    eventType: "blocked",
    reason,
    rawContext: raw_context,
  });

  const slackNotification = await notificationService.notifyTaskBlocked({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    reason,
  });

  return {
    task_session_id: session.id,
    block_report_id: blockReport.id,
    status: session.status,
    reason: blockReport.reason,
    slack_notification: slackNotification,
    message: "詰まり情報を登録しました。",
  };
};
