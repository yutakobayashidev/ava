import { Env } from "@/app/create-app";
import { notifyTaskCompleted } from "@/lib/taskNotifications";
import { createTaskRepository } from "@/repos";

export type CompleteTask = {
  task_session_id: string;
  pr_url: string;
  summary: string;
};

export const completeTask = async (
  params: CompleteTask,
  ctx: Env["Variables"],
) => {
  const { task_session_id, pr_url, summary } = params;

  const [workspace, db] = [ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });

  const { session, completion, unresolvedBlocks } =
    await taskRepository.completeTask({
      taskSessionId: task_session_id,
      workspaceId: workspace.id,
      prUrl: pr_url,
      summary,
    });

  const slackNotification = await notifyTaskCompleted({
    sessionId: session.id,
    workspaceId: workspace.id,
    summary,
    prUrl: pr_url,
  });

  const response: Record<string, unknown> = {
    task_session_id: session.id,
    completion_id: completion.id,
    status: session.status,
    pr_url: completion.prUrl,
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
