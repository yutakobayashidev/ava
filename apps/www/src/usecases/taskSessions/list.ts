import type { TaskQueryRepository } from "@/repos";
import type { ListTasksInput, ListTasksOutput } from "./interface";

// ステータスをDBの形式に変換
function convertStatusToDb(
  status?: string,
): "in_progress" | "blocked" | "paused" | "completed" | undefined {
  if (status === "inProgress") return "in_progress";
  if (status === "blocked" || status === "paused" || status === "completed")
    return status;
  return undefined;
}

export const createListTasks = (taskRepository: TaskQueryRepository) => {
  return async (input: ListTasksInput): Promise<ListTasksOutput> => {
    const { workspace, user, params } = input;
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
