import { InternalServerError } from "@/errors";
import type { TaskRepository } from "@/repos";
import { type ResultAsync, okAsync } from "neverthrow";
import type {
  ListTaskSessionsCommand,
  ListTaskSessionsCompleted,
} from "./interface";

export const createListTaskSessions = (taskRepository: TaskRepository) => {
  return (
    command: ListTaskSessionsCommand,
  ): ResultAsync<ListTaskSessionsCompleted, InternalServerError> => {
    const { workspace, user, status, limit } = command.input;

    return okAsync(command)
      .andThen(() =>
        taskRepository.listTaskSessions({
          userId: user.id,
          workspaceId: workspace.id,
          status,
          limit,
        }),
      )
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
