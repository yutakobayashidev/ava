import "server-only";

import { postMessage, addReaction } from "@/clients/slack";
import type { TaskRepository } from "@/repos";
import type { Workspace } from "@/db/schema";

/**
 * 通知の配信結果
 */
type NotificationResult = {
  delivered: boolean;
  channel?: string;
  threadTs?: string;
  workspaceId?: string;
  source?: "workspace";
  reason?: "missing_config" | "api_error";
  error?: string;
};

/**
 * Slack設定
 */
type SlackConfig = {
  token: string;
  channel: string;
  workspaceId: string;
};

/**
 * タスクセッション情報（スレッド情報含む）
 */
type TaskSessionInfo = {
  id: string;
  slackThreadTs: string | null;
  slackChannel: string | null;
};

/**
 * スレッド情報を検証し、エラーを返す
 */
const validateThreadInfo = (
  session: TaskSessionInfo,
): NotificationResult | null => {
  if (!session.slackThreadTs || !session.slackChannel) {
    return {
      delivered: false,
      reason: "api_error",
      error: "No Slack thread found for this task",
    };
  }
  return null;
};

/**
 * Slackへメッセージを投稿し、結果を返す
 */
const sendMessage = async (
  slackConfig: SlackConfig,
  channel: string,
  text: string,
  threadTs?: string,
): Promise<NotificationResult> => {
  try {
    const result = await postMessage({
      token: slackConfig.token,
      channel,
      text,
      threadTs,
    });

    return {
      delivered: true,
      channel: result.channel,
      threadTs: result.ts,
      workspaceId: slackConfig.workspaceId,
      source: "workspace",
    };
  } catch (error) {
    console.error("Failed to post Slack notification", error);
    return {
      delivered: false,
      reason: "api_error",
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
};

/**
 * NotificationService
 */
type NotificationService = {
  notifyTaskStarted: (params: {
    session: { id: string };
    issue: {
      title: string;
      provider: string;
      id?: string | null;
    };
    initialSummary: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      slackId?: string | null;
    };
  }) => Promise<NotificationResult>;
  notifyTaskUpdate: (params: {
    session: TaskSessionInfo;
    summary: string;
  }) => Promise<NotificationResult>;
  notifyTaskBlocked: (params: {
    session: TaskSessionInfo;
    reason: string;
  }) => Promise<NotificationResult>;
  notifyBlockResolved: (params: {
    session: TaskSessionInfo;
    blockReason: string;
  }) => Promise<NotificationResult>;
  notifyTaskPaused: (params: {
    session: TaskSessionInfo;
    reason: string;
  }) => Promise<NotificationResult>;
  notifyTaskResumed: (params: {
    session: TaskSessionInfo;
    summary: string;
  }) => Promise<NotificationResult>;
  notifyTaskCompleted: (params: {
    session: TaskSessionInfo;
    summary: string;
  }) => Promise<NotificationResult>;
};

/**
 * NotificationServiceを作成する
 */
export const createNotificationService = (
  workspace: Workspace,
  taskRepository: TaskRepository,
): NotificationService => {
  /**
   * Slack設定を取得
   */
  const resolveSlackConfig = (): SlackConfig | null => {
    if (!workspace.botAccessToken || !workspace.notificationChannelId) {
      return null;
    }

    return {
      token: workspace.botAccessToken,
      channel: workspace.notificationChannelId,
      workspaceId: workspace.id,
    };
  };

  /**
   * Slack設定チェック + 実行
   */
  const withSlackConfig = async (
    fn: (config: SlackConfig) => Promise<NotificationResult>,
  ): Promise<NotificationResult> => {
    const slackConfig = resolveSlackConfig();
    if (!slackConfig) {
      return { delivered: false, reason: "missing_config" };
    }
    return fn(slackConfig);
  };

  return {
    notifyTaskStarted: (params) =>
      withSlackConfig(async (config) => {
        const { session, issue, initialSummary, user } = params;

        const issueIdText = issue.id ? ` (${issue.id})` : "";
        const userLabel = user.slackId
          ? `<@${user.slackId}>`
          : (user.name ?? user.email ?? "unknown user");

        const text = [
          ":rocket: Task started",
          `Title: ${issue.title}${issueIdText}`,
          `Session ID: ${session.id}`,
          `Issue Provider: ${issue.provider}`,
          `Started by: ${userLabel}`,
          "",
          `Summary: ${initialSummary}`,
        ].join("\n");

        const result = await sendMessage(config, config.channel, text);

        // スレッド情報を保存
        if (result.delivered && result.threadTs && result.channel) {
          await taskRepository.updateSlackThread({
            taskSessionId: session.id,
            workspaceId: workspace.id,
            userId: user.id,
            threadTs: result.threadTs,
            channel: result.channel,
          });
        }

        return result;
      }),

    notifyTaskUpdate: (params) =>
      withSlackConfig(async (config) => {
        const { session, summary } = params;

        const validationError = validateThreadInfo(session);
        if (validationError) return validationError;

        const text = [
          ":arrow_forward: Progress update",
          `Summary: ${summary}`,
        ].join("\n");

        return sendMessage(
          config,
          session.slackChannel!,
          text,
          session.slackThreadTs!,
        );
      }),

    notifyTaskBlocked: (params) =>
      withSlackConfig(async (config) => {
        const { session, reason } = params;

        const validationError = validateThreadInfo(session);
        if (validationError) return validationError;

        const text = [":warning: Task blocked", `Reason: ${reason}`].join("\n");

        return sendMessage(
          config,
          session.slackChannel!,
          text,
          session.slackThreadTs!,
        );
      }),

    notifyBlockResolved: (params) =>
      withSlackConfig(async (config) => {
        const { session, blockReason } = params;

        const validationError = validateThreadInfo(session);
        if (validationError) return validationError;

        const text = [
          ":white_check_mark: Block resolved",
          `Previous issue: ${blockReason}`,
        ].join("\n");

        return sendMessage(
          config,
          session.slackChannel!,
          text,
          session.slackThreadTs!,
        );
      }),

    notifyTaskPaused: (params) =>
      withSlackConfig(async (config) => {
        const { session, reason } = params;

        const validationError = validateThreadInfo(session);
        if (validationError) return validationError;

        const text = [":pause_button: Task paused", `Reason: ${reason}`].join(
          "\n",
        );

        return sendMessage(
          config,
          session.slackChannel!,
          text,
          session.slackThreadTs!,
        );
      }),

    notifyTaskResumed: (params) =>
      withSlackConfig(async (config) => {
        const { session, summary } = params;

        const validationError = validateThreadInfo(session);
        if (validationError) return validationError;

        const text = [
          ":arrow_forward: Task resumed",
          `Summary: ${summary}`,
        ].join("\n");

        return sendMessage(
          config,
          session.slackChannel!,
          text,
          session.slackThreadTs!,
        );
      }),

    notifyTaskCompleted: (params) =>
      withSlackConfig(async (config) => {
        const { session, summary } = params;

        const validationError = validateThreadInfo(session);
        if (validationError) return validationError;

        const text = [
          ":white_check_mark: Task completed",
          `Summary: ${summary}`,
        ].join("\n");

        const result = await sendMessage(
          config,
          session.slackChannel!,
          text,
          session.slackThreadTs!,
        );

        // リアクションを追加
        if (result.delivered) {
          try {
            await addReaction({
              token: config.token,
              channel: session.slackChannel!,
              timestamp: session.slackThreadTs!,
              name: "white_check_mark",
            });
          } catch (reactionError) {
            console.error(
              "Failed to add reaction to completed task",
              reactionError,
            );
          }
        }

        return result;
      }),
  };
};
