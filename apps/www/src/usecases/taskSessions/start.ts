import { InternalServerError } from "@/errors";
import { createStartedTaskSession } from "@/models/taskSessions";
import type { TaskRepository } from "@/repos";
import { createSubscriptionRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { checkFreePlanLimit } from "@/services/subscriptionService";
import {
  type Result,
  type ResultAsync,
  fromPromise,
  ok,
  okAsync,
  safeTry,
} from "neverthrow";
import type {
  CreateTaskSessionCommand,
  CreateTaskSessionCompleted,
  CreateTaskSessionCreated,
} from "./interface";
import { buildTaskStartedMessage } from "./slackMessages";

/**
 * タスクセッションの作成
 */
export const createTaskSession =
  () =>
  (
    command: CreateTaskSessionCommand,
  ): Result<CreateTaskSessionCreated, never> =>
    safeTry(function* () {
      const createdRequest = yield* createStartedTaskSession({
        userId: command.input.user.id,
        workspaceId: command.input.workspace.id,
        issueProvider: command.input.issue.provider,
        issueId: command.input.issue.id ?? null,
        issueTitle: command.input.issue.title,
        initialSummary: command.input.initialSummary,
      });
      return ok({
        kind: "CreateTaskSessionCreated" as const,
        input: command.input,
        request: createdRequest,
      });
    });

/**
 * Slack通知とスレッド情報の保存、そして完了オブジェクトの作成
 */
const notifySlackAndComplete =
  (
    taskRepository: TaskRepository,
    slackNotificationService: SlackNotificationService,
  ) =>
  (
    created: CreateTaskSessionCreated,
  ): ResultAsync<CreateTaskSessionCompleted, InternalServerError> =>
    safeTry(async function* () {
      const { workspace, user, issue, initialSummary } = created.input;
      const sessionId = created.request.id;

      let slackNotification: { delivered: boolean; reason?: string };

      if (!workspace.notificationChannelId) {
        slackNotification = {
          delivered: false,
          reason: "Notification channel not configured",
        };
      } else {
        // メッセージ組み立て
        const message = buildTaskStartedMessage({
          session: { id: sessionId },
          issue: {
            title: issue.title,
            provider: issue.provider,
            id: issue.id ?? null,
          },
          initialSummary,
          user: {
            name: user.name,
            email: user.email,
            slackId: user.slackId,
          },
        });

        // Slack通知
        const notification = yield* fromPromise(
          slackNotificationService.postMessage({
            workspace,
            channel: workspace.notificationChannelId,
            message,
          }),
          (error) =>
            new InternalServerError("Failed to post Slack message", error),
        );

        // スレッド情報を保存
        if (
          notification.delivered &&
          notification.threadTs &&
          notification.channel
        ) {
          yield* taskRepository.updateSlackThread({
            taskSessionId: sessionId,
            workspaceId: workspace.id,
            userId: user.id,
            threadTs: notification.threadTs,
            channel: notification.channel,
          });
        }

        slackNotification = {
          delivered: notification.delivered,
          reason: notification.error,
        };
      }

      return ok({
        kind: "CreateTaskSessionCompleted" as const,
        result: {
          success: true as const,
          input: created.input,
          session: {
            id: created.request.id,
            userId: created.request.userId,
            workspaceId: created.request.workspaceId,
            issueProvider: created.request.issueProvider,
            issueId: created.request.issueId ?? null,
            issueTitle: created.request.issueTitle,
            initialSummary: created.request.initialSummary,
          },
          slackNotification,
        },
      });
    });

export const createStartTaskWorkflow = (
  taskRepository: TaskRepository,
  subscriptionRepository: ReturnType<typeof createSubscriptionRepository>,
  slackNotificationService: SlackNotificationService,
) => {
  const notifyAndComplete = notifySlackAndComplete(
    taskRepository,
    slackNotificationService,
  );

  return (
    command: CreateTaskSessionCommand,
  ): ResultAsync<CreateTaskSessionCompleted, InternalServerError> => {
    return okAsync(command)
      .andThrough((command) =>
        checkFreePlanLimit(command.input.user.id, subscriptionRepository),
      )
      .andThen(createTaskSession())
      .andThrough(taskRepository.createTaskSession)
      .andThen(notifyAndComplete)
      .mapErr((error) => {
        console.error(error);
        return error;
      });
  };
};
