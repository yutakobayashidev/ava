import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { InternalServerError } from "@/errors";
import { createCompletedTaskSession } from "@/models/taskSessions";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { type ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow";
import type {
  CompleteTaskSessionCommand,
  CompleteTaskSessionCompleted,
  CompleteTaskSessionInput,
} from "./interface";
import { buildTaskCompletedMessage } from "./slackMessages";

const notifySlackForCompletion =
  (slackNotificationService: SlackNotificationService) =>
  (params: {
    workspace: CompleteTaskSessionInput["workspace"];
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

    const message = buildTaskCompletedMessage({ summary });

    return fromPromise(
      (async () => {
        const notification = await slackNotificationService.postMessage({
          workspace,
          channel: slackThread.channel,
          message,
          threadTs: slackThread.threadTs,
        });

        // リアクションを追加
        if (notification.delivered) {
          await slackNotificationService.addReaction({
            workspace,
            channel: slackThread.channel,
            timestamp: slackThread.threadTs,
            emoji: "white_check_mark",
          });
        }

        return {
          delivered: notification.delivered,
          reason: notification.error,
        };
      })(),
      (error) => new InternalServerError("Slack notification failed", error),
    );
  };

export const createCompleteTaskSessionWorkflow = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  const notifySlack = notifySlackForCompletion(slackNotificationService);

  return (
    command: CompleteTaskSessionCommand,
  ): ResultAsync<CompleteTaskSessionCompleted, InternalServerError> => {
    const { workspace, user, taskSessionId, summary } = command.input;

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
        isValidTransition(currentSession.status, "completed")
          ? okAsync(currentSession)
          : errAsync(
              new InternalServerError(
                `Invalid status transition: ${currentSession.status} → completed. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
              ),
            ),
      )
      .andThen(() =>
        taskRepository
          .completeTask({
            request: createCompletedTaskSession({
              taskSessionId,
              workspaceId: workspace.id,
              userId: user.id,
              summary,
            }),
          })
          .andThen(({ session, completedEvent, unresolvedBlocks }) => {
            if (!session || !completedEvent) {
              return errAsync(
                new InternalServerError("タスクの完了処理に失敗しました"),
              );
            }

            const slackThread = createSlackThreadInfo({
              channel: session.slackChannel,
              threadTs: session.slackThreadTs,
            });

            return notifySlack({ workspace, slackThread, summary }).map(
              (slackNotification) => ({
                session,
                completedEvent,
                unresolvedBlocks,
                slackNotification,
              }),
            );
          }),
      )
      .map(
        ({ session, completedEvent, unresolvedBlocks, slackNotification }) => ({
          kind: "CompleteTaskSessionCompleted" as const,
          result: {
            input: command.input,
            taskSessionId: session.id,
            completionId: completedEvent.id,
            status: "completed" as const,
            slackNotification,
            unresolvedBlocks: unresolvedBlocks.map((block) => ({
              blockReportId: block.id,
              reason: block.reason,
              createdAt: block.createdAt,
            })),
          },
        }),
      )
      .mapErr((error) => {
        console.error(error);
        return error;
      });
  };
};
