import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { InternalServerError } from "@/errors";
import {
  createPausedTaskSession,
  createFindTaskSessionByIdRequest,
} from "@/models/taskSessions";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";
import type { PauseTaskInput, PauseTaskWorkflow } from "./interface";
import { buildTaskPausedMessage } from "./slackMessages";

const notifySlackForPause =
  (slackNotificationService: SlackNotificationService) =>
  (params: {
    workspace: PauseTaskInput["workspace"];
    slackThread: { channel: string; threadTs: string } | null;
    sessionId: string;
    reason: string;
  }): ResultAsync<
    { delivered: boolean; reason?: string },
    InternalServerError
  > => {
    const { workspace, slackThread, sessionId, reason } = params;

    if (!slackThread) {
      return okAsync({
        delivered: false,
        reason: "Slack thread not configured",
      });
    }

    const message = buildTaskPausedMessage({
      session: { id: sessionId },
      reason,
    });

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

export const createPauseTaskWorkflow = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
): PauseTaskWorkflow => {
  const notifySlack = notifySlackForPause(slackNotificationService);

  return (command) => {
    const { workspace, user, taskSessionId, reason, rawContext } =
      command.input;

    return okAsync(
      createFindTaskSessionByIdRequest({
        taskSessionId,
        workspaceId: workspace.id,
        userId: user.id,
      }),
    )
      .andThen((request) => taskRepository.findTaskSessionById({ request }))
      .andThen((currentSession) =>
        currentSession
          ? okAsync(currentSession)
          : errAsync(
              new InternalServerError("タスクセッションが見つかりません"),
            ),
      )
      .andThen((currentSession) =>
        isValidTransition(currentSession.status, "paused")
          ? okAsync(currentSession)
          : errAsync(
              new InternalServerError(
                `Invalid status transition: ${currentSession.status} → paused. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
              ),
            ),
      )
      .andThen(() =>
        taskRepository
          .pauseTask({
            request: createPausedTaskSession({
              taskSessionId,
              workspaceId: workspace.id,
              userId: user.id,
              reason,
              rawContext: rawContext ?? {},
            }),
          })
          .andThen(({ session, pauseReport }) => {
            if (!session || !pauseReport) {
              return errAsync(
                new InternalServerError("タスクの一時停止処理に失敗しました"),
              );
            }

            const slackThread = createSlackThreadInfo({
              channel: session.slackChannel,
              threadTs: session.slackThreadTs,
            });

            return notifySlack({
              workspace,
              slackThread,
              sessionId: session.id,
              reason,
            }).map((slackNotification) => ({
              session,
              pauseReport,
              slackNotification,
            }));
          }),
      )
      .map(({ session, pauseReport, slackNotification }) => ({
        kind: "PauseTaskCompleted" as const,
        result: {
          input: command.input,
          taskSessionId: session.id,
          pauseReportId: pauseReport.id,
          status: "paused" as const,
          pausedAt: pauseReport.createdAt,
          slackNotification,
        },
      }))
      .mapErr((error) => {
        console.error(error);
        return error;
      });
  };
};
