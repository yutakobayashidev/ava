import { createTaskRepository } from "@/repos";
import { HonoEnv } from "@/types";

type ListTasks = {
  status?: "inProgress" | "blocked" | "paused" | "completed";
  limit?: number;
};

// ステータスをDBの形式に変換
function convertStatusToDb(
  status?: string,
): "in_progress" | "blocked" | "paused" | "completed" | undefined {
  if (status === "inProgress") return "in_progress";
  if (status === "blocked" || status === "paused" || status === "completed")
    return status;
  return undefined;
}

type TaskSummary = {
  taskSessionId: string;
  issueProvider: string;
  issueId: string | null;
  issueTitle: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type ListTasksSuccess = {
  total: number;
  tasks: TaskSummary[];
};

type ListTasksResult =
  | { success: true; data: ListTasksSuccess }
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
      status: convertStatusToDb(status),
      limit,
    });

    return {
      success: true,
      data: {
        total: sessions.length,
        tasks: sessions.map((session) => ({
          taskSessionId: session.id,
          issueProvider: session.issueProvider,
          issueId: session.issueId,
          issueTitle: session.issueTitle,
          status: session.status,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })),
      },
    };
  };
};
