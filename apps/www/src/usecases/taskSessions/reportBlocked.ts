import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { InternalServerError } from "@/errors";
import { createBlockedTaskSession } from "@/models/taskSessions";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";
import type {
  ReportBlockedCommand,
  ReportBlockedCompleted,
  ReportBlockedInput,
} from "./interface";
import { buildTaskBlockedMessage } from "./slackMessages";

const notifySlackForBlocked =
  (slackNotificationService: SlackNotificationService) =>
  (params: {
    workspace: ReportBlockedInput["workspace"];
    slackThread: { channel: string; threadTs: string } | null;
    sessionId: string;
    blockReportId: string;
    reason: string;
  }): ResultAsync<
    { delivered: boolean; reason?: string },
    InternalServerError
  > => {
    const { workspace, slackThread, sessionId, blockReportId, reason } = params;

    if (!slackThread) {
      return okAsync({
        delivered: false,
        reason: "Slack thread not configured",
      });
    }

    const message = buildTaskBlockedMessage({
      session: { id: sessionId },
      blockReportId,
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

export const createReportBlocked = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  const notifySlack = notifySlackForBlocked(slackNotificationService);

  return (
    command: ReportBlockedCommand,
  ): ResultAsync<ReportBlockedCompleted, InternalServerError> => {
    const { workspace, user, taskSessionId, reason, rawContext } =
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
        isValidTransition(currentSession.status, "blocked")
          ? okAsync(currentSession)
          : errAsync(
              new InternalServerError(
                `Invalid status transition: ${currentSession.status} → blocked. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
              ),
            ),
      )
      .andThen(() =>
        taskRepository
          .reportBlock({
            request: createBlockedTaskSession({
              taskSessionId,
              workspaceId: workspace.id,
              userId: user.id,
              reason,
              rawContext: rawContext ?? {},
            }),
          })
          .andThen(({ session, blockReport }) => {
            if (!session || !blockReport) {
              return errAsync(
                new InternalServerError("ブロッキング報告の処理に失敗しました"),
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
              blockReportId: blockReport.id,
              reason,
            }).map((slackNotification) => ({
              session,
              blockReport,
              slackNotification,
            }));
          }),
      )
      .map(({ session, blockReport, slackNotification }) => ({
        kind: "ReportBlockedCompleted" as const,
        result: {
          input: command.input,
          taskSessionId: session.id,
          blockReportId: blockReport.id,
          status: "blocked" as const,
          reason: blockReport.reason ?? "",
          slackNotification,
        },
      }))
      .mapErr((error) => {
        console.error(error);
        return error;
      });
  };
};
