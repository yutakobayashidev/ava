import { toTaskStatus } from "@/objects/task/task-status";
import type { TaskQueryRepository } from "@/repos";
import type { ListTasksCommand, ListTasksOutput } from "./interface";

type ListTasksWorkflow = (
  command: ListTasksCommand,
) => Promise<ListTasksOutput>;

export const createListTasksWorkflow = (
  taskRepository: TaskQueryRepository,
): ListTasksWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { status, limit } = params;

    const sessions = await taskRepository.listTaskSessions({
      userId: user.id,
      workspaceId: workspace.id,
      status: toTaskStatus(status),
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
