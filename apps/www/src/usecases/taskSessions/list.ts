import type { TaskRepository } from "@/repos";
import { createListTaskSessionsRequest } from "@/models/taskSessions";
import { okAsync } from "neverthrow";
import type { ListTaskSessionsWorkflow } from "./interface";

export const createListTaskSessionsWorkflow = (
  taskRepository: TaskRepository,
): ListTaskSessionsWorkflow => {
  return (command) => {
    const { workspace, user, status, limit } = command.input;

    return okAsync(
      createListTaskSessionsRequest({
        userId: user.id,
        workspaceId: workspace.id,
        status,
        limit,
      }),
    )
      .andThen((request) => taskRepository.listTaskSessions({ request }))
      .map((sessions) => {
        return {
          kind: "ListTaskSessionsCompleted" as const,
          result: {
            input: command.input,
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
      });
  };
};
