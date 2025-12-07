import { InternalServerError } from "@/errors";
import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { buildBlockResolvedMessage } from "./slackMessages";
import { createResolvedBlockTaskSession } from "@/models/taskSessions";
import { type ResultAsync, okAsync, errAsync, fromPromise } from "neverthrow";
import type {
  ResolveBlockedCommand,
  ResolveBlockedCompleted,
  ResolveBlockedInput,
} from "./interface";

const notifySlackForResolveBlocked =
  (slackNotificationService: SlackNotificationService) =>
  (params: {
    workspace: ResolveBlockedInput["workspace"];
    slackThread: { channel: string; threadTs: string } | null;
    blockReason: string;
  }): ResultAsync<
    { delivered: boolean; reason?: string },
    InternalServerError
  > => {
    const { workspace, slackThread, blockReason } = params;

    if (!slackThread) {
      return okAsync({
        delivered: false,
        reason: "Slack thread not configured",
      });
    }

    const message = buildBlockResolvedMessage({ blockReason });

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

export const createResolveBlocked = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  const notifySlack = notifySlackForResolveBlocked(slackNotificationService);

  return (
    command: ResolveBlockedCommand,
  ): ResultAsync<ResolveBlockedCompleted, InternalServerError> => {
    const { workspace, user, taskSessionId, blockReportId } = command.input;

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
          .resolveBlockReport({
            request: createResolvedBlockTaskSession({
              taskSessionId,
              workspaceId: workspace.id,
              userId: user.id,
              blockReportId,
            }),
          })
          .andThen(({ session, blockReport }) => {
            if (!session || !blockReport) {
              return errAsync(
                new InternalServerError("ブロッキングの解決処理に失敗しました"),
              );
            }

            const slackThread = createSlackThreadInfo({
              channel: session.slackChannel,
              threadTs: session.slackThreadTs,
            });

            return notifySlack({
              workspace,
              slackThread,
              blockReason: blockReport.reason ?? "Unknown block",
            }).map((slackNotification) => ({
              session,
              blockReport,
              slackNotification,
            }));
          }),
      )
      .map(
        ({ session, blockReport, slackNotification }) =>
          ({
            kind: "ResolveBlockedCompleted" as const,
            result: {
              input: command.input,
              taskSessionId: session.id,
              blockReportId: blockReport.id,
              status: session.status,
              resolvedAt: blockReport.createdAt,
              slackNotification,
            },
          }) as ResolveBlockedCompleted,
      )
      .mapErr((error) => {
        console.error(error);
        return error;
      });
  };
};
