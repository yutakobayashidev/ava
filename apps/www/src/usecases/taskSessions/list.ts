import { Env } from "@/app/create-app";
import { createTaskRepository } from "@/repos";

type ListTasks = {
  status?: "in_progress" | "blocked" | "paused" | "completed";
  limit?: number;
};

export const listTasks = async (
  params: ListTasks,
  ctx: Env["Variables"],
): Promise<
  { success: true; data: string } | { success: false; error: string }
> => {
  const { status, limit } = params;

  const [user, workspace, db] = [ctx.user, ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });

  const sessions = await taskRepository.listTaskSessions({
    userId: user.id,
    workspaceId: workspace.id,
    status,
    limit,
  });

  const result = {
    total: sessions.length,
    tasks: sessions.map((session) => ({
      task_session_id: session.id,
      issue_provider: session.issueProvider,
      issue_id: session.issueId,
      issue_title: session.issueTitle,
      status: session.status,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    })),
  };

  return {
    success: true,
    data: JSON.stringify(result, null, 2),
  };
};
