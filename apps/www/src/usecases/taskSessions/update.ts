import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { InternalServerError } from "@/errors";
import { createUpdatedTaskSession } from "@/models/taskSessions";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";
import type {
  UpdateTaskSessionCompleted,
  UpdateTaskSessionInput,
  UpdateTaskSessionWorkflow,
} from "./interface";
import { buildTaskUpdateMessage } from "./slackMessages";

const notifySlackForUpdate =
  (slackNotificationService: SlackNotificationService) =>
  (params: {
    workspace: UpdateTaskSessionInput["workspace"];
    slackThread: { channel: string; threadTs: string } | null;
    summary: string;
  }): ResultAsync<
    { delivered: boolean; reason?: string },
    InternalServerError
  > => {
    const { workspace, slackThread, summary } = params;

    if (!slackThread) {
      return okAsync({
        delivered: false,
        reason: "Slack thread not configured",
      });
    }

    const message = buildTaskUpdateMessage({ summary });

    return fromPromise(
      slackNotificationService.postMessage({
        workspace,
        channel: slackThread.channel,
        message,
        threadTs: slackThread.threadTs,
      }),
      (error) => new InternalServerError("Slack notification failed", error),
    ).map((notification) => ({
      delivered: notification.delivered,
      reason: notification.error,
    }));
  };

export const createUpdateTaskSessionWorkflow = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
): UpdateTaskSessionWorkflow => {
  const notifySlack = notifySlackForUpdate(slackNotificationService);

  return (command) => {
    const { workspace, user, taskSessionId, summary, rawContext } =
      command.input;

    return taskRepository
      .findTaskSessionById(taskSessionId, workspace.id, user.id)
      .andThen((currentSession) => {
        if (!currentSession) {
          return errAsync(
            new InternalServerError("タスクセッションが見つかりません"),
          );
        }
        return okAsync(currentSession);
      })
      .andThen((currentSession) => {
        if (!isValidTransition(currentSession.status, "in_progress")) {
          return errAsync(
            new InternalServerError(
              `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
            ),
          );
        }
        return okAsync(currentSession);
      })
      .andThen(() => {
        const updatedTask = createUpdatedTaskSession({
          taskSessionId,
          workspaceId: workspace.id,
          userId: user.id,
          summary,
          rawContext: rawContext ?? {},
        });

        return taskRepository
          .addTaskUpdate({ request: updatedTask })
          .andThen(({ session, updateEvent }) => {
            if (!session || !updateEvent) {
              return errAsync(
                new InternalServerError("タスクの更新に失敗しました"),
              );
            }

            const slackThread = createSlackThreadInfo({
              channel: session.slackChannel,
              threadTs: session.slackThreadTs,
            });

            return notifySlack({ workspace, slackThread, summary }).map(
              (slackNotification) => ({
                session,
                updateEvent,
                slackNotification,
              }),
            );
          });
      })
      .map(
        ({ session, updateEvent, slackNotification }) =>
          ({
            kind: "UpdateTaskSessionCompleted" as const,
            result: {
              input: command.input,
              taskSessionId: session.id,
              updateId: updateEvent.id,
              status: session.status,
              summary: updateEvent.summary ?? "",
              slackNotification,
            },
          }) as UpdateTaskSessionCompleted,
      )
      .mapErr((error) => {
        console.error(error);
        return error;
      });
  };
};
