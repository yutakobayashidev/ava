import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { InternalServerError } from "@/errors";
import { createResumedTaskSession } from "@/models/taskSessions";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";
import type {
  ResumeTaskCommand,
  ResumeTaskCompleted,
  ResumeTaskInput,
} from "./interface";
import { buildTaskResumedMessage } from "./slackMessages";

const notifySlackForResume =
  (slackNotificationService: SlackNotificationService) =>
  (params: {
    workspace: ResumeTaskInput["workspace"];
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

    const message = buildTaskResumedMessage({ summary });

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

export const createResumeTask = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  const notifySlack = notifySlackForResume(slackNotificationService);

  return (
    command: ResumeTaskCommand,
  ): ResultAsync<ResumeTaskCompleted, InternalServerError> => {
    const { workspace, user, taskSessionId, summary, rawContext } =
      command.input;

    return okAsync(command)
      .andThen(() =>
        taskRepository.findTaskSessionById(
          taskSessionId,
          workspace.id,
          user.id,
        ),
      )
      .andThen((currentSession) =>
        currentSession
          ? okAsync(currentSession)
          : errAsync(
              new InternalServerError("タスクセッションが見つかりません"),
            ),
      )
      .andThen((currentSession) =>
        isValidTransition(currentSession.status, "in_progress")
          ? okAsync(currentSession)
          : errAsync(
              new InternalServerError(
                `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
              ),
            ),
      )
      .andThen(() =>
        taskRepository
          .resumeTask({
            request: createResumedTaskSession({
              taskSessionId,
              workspaceId: workspace.id,
              userId: user.id,
              summary,
              rawContext: rawContext ?? {},
            }),
          })
          .andThen(({ session }) => {
            if (!session) {
              return errAsync(
                new InternalServerError("タスクの再開処理に失敗しました"),
              );
            }

            const slackThread = createSlackThreadInfo({
              channel: session.slackChannel,
              threadTs: session.slackThreadTs,
            });

            return notifySlack({ workspace, slackThread, summary }).map(
              (slackNotification) => ({
                session,
                slackNotification,
              }),
            );
          }),
      )
      .map(({ session, slackNotification }) => ({
        kind: "ResumeTaskCompleted" as const,
        result: {
          input: command.input,
          taskSessionId: session.id,
          status: "in_progress" as const,
          resumedAt: session.updatedAt,
          slackNotification,
        },
      }))
      .mapErr((error) => {
        console.error(error);
        return error;
      });
  };
};
