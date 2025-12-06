import { createTaskRepository } from "@/repos";
import { HonoEnv } from "@/types";

type ListTasks = {
  status?: "in_progress" | "blocked" | "paused" | "completed";
  limit?: number;
};

type ListTasksResult =
  | { success: true; data: string }
  | { success: false; error: string };

export const createListTasks = (
  taskRepository: ReturnType<typeof createTaskRepository>,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: ListTasks): Promise<ListTasksResult> => {
    const { status, limit } = params;

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
};
