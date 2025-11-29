import { Env } from "@/app/create-app";
import { createTaskRepository } from "@/repos";

export type ListTasks = {
  status?: "in_progress" | "blocked" | "paused" | "completed";
  limit?: number;
};

export const listTasks = async (params: ListTasks, ctx: Env["Variables"]) => {
  const { status, limit } = params;

  const [user, workspace, db] = [ctx.user, ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });

  const sessions = await taskRepository.listTaskSessions({
    userId: user.id,
    workspaceId: workspace.id,
    status,
    limit,
  });

  return {
    total: sessions.length,
    tasks: sessions.map((session) => ({
      task_session_id: session.id,
      issue_provider: session.issueProvider,
      issue_id: session.issueId,
      issue_title: session.issueTitle,
      status: session.status,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      blocked_at: session.blockedAt,
      completed_at: session.completedAt,
    })),
  };
};
