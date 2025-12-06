import "server-only";

import { getWorkspaceBotToken } from "@/lib/slack";
import type { TaskRepository, WorkspaceRepository } from "@/repos";
import type { Workspace } from "@ava/database/schema";
import { addReaction, postMessage } from "@ava/integrations/slack";
import type { Block } from "@slack/web-api";

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
  blocks?: Block[],
): Promise<NotificationResult> => {
  try {
    const result = await postMessage({
      token: slackConfig.token,
      channel,
      text,
      threadTs,
      blocks,
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
export type NotificationService = {
  notifyTaskStarted: (params: {
    workspace: Workspace;
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
    workspace: Workspace;
    session: TaskSessionInfo;
    summary: string;
  }) => Promise<NotificationResult>;
  notifyTaskBlocked: (params: {
    workspace: Workspace;
    session: TaskSessionInfo;
    reason: string;
    blockReportId: string;
  }) => Promise<NotificationResult>;
  notifyBlockResolved: (params: {
    workspace: Workspace;
    session: TaskSessionInfo;
    blockReason: string;
  }) => Promise<NotificationResult>;
  notifyTaskPaused: (params: {
    workspace: Workspace;
    session: TaskSessionInfo;
    reason: string;
  }) => Promise<NotificationResult>;
  notifyTaskResumed: (params: {
    workspace: Workspace;
    session: TaskSessionInfo;
    summary: string;
  }) => Promise<NotificationResult>;
  notifyTaskCompleted: (params: {
    workspace: Workspace;
    session: TaskSessionInfo;
    summary: string;
  }) => Promise<NotificationResult>;
};

/**
 * NotificationServiceを作成する
 */
export const createNotificationService = (
  taskRepository: TaskRepository,
  workspaceRepository: WorkspaceRepository,
): NotificationService => {
  /**
   * Slack設定を取得
   */
  const resolveSlackConfig = (workspace: Workspace): SlackConfig | null => {
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
   * Slack設定チェック + 実行（トークンローテーションを含む）
   */
  const withSlackConfig = async (
    workspace: Workspace,
    fn: (config: SlackConfig) => Promise<NotificationResult>,
  ): Promise<NotificationResult> => {
    const slackConfig = resolveSlackConfig(workspace);
    if (!slackConfig) {
      return { delivered: false, reason: "missing_config" };
    }

    try {
      // トークンローテーションを実行（必要に応じて）
      const validToken = await getWorkspaceBotToken({
        workspace,
        workspaceRepository,
      });

      // 有効なトークンでconfigを更新
      const configWithValidToken = {
        ...slackConfig,
        token: validToken,
      };

      return fn(configWithValidToken);
    } catch (error) {
      console.error("Failed to get valid bot token", error);
      return {
        delivered: false,
        reason: "api_error",
        error: error instanceof Error ? error.message : "token_error",
      };
    }
  };

  return {
    notifyTaskStarted: (params) =>
      withSlackConfig(params.workspace, async (config) => {
        const { workspace, session, issue, initialSummary, user } = params;

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

        const blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "✅ 完了",
                },
                style: "primary",
                value: session.id,
                action_id: "complete_task",
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "⚠️ ブロッキング報告",
                },
                style: "danger",
                value: session.id,
                action_id: "report_blocked",
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "⏸️ 休止",
                },
                value: session.id,
                action_id: "pause_task",
              },
            ],
          },
        ];

        const result = await sendMessage(
          config,
          config.channel,
          text,
          undefined,
          blocks,
        );

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
      withSlackConfig(params.workspace, async (config) => {
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
      withSlackConfig(params.workspace, async (config) => {
        const { session, reason, blockReportId } = params;

        const validationError = validateThreadInfo(session);
        if (validationError) return validationError;

        const text = [":warning: Task blocked", `Reason: ${reason}`].join("\n");

        const blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "✅ 解決",
                },
                style: "primary",
                value: JSON.stringify({
                  taskSessionId: session.id,
                  blockReportId,
                }),
                action_id: "resolve_blocked",
              },
            ],
          },
        ];

        return sendMessage(
          config,
          session.slackChannel!,
          text,
          session.slackThreadTs!,
          blocks,
        );
      }),

    notifyBlockResolved: (params) =>
      withSlackConfig(params.workspace, async (config) => {
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
      withSlackConfig(params.workspace, async (config) => {
        const { session, reason } = params;

        const validationError = validateThreadInfo(session);
        if (validationError) return validationError;

        const text = [":pause_button: Task paused", `Reason: ${reason}`].join(
          "\n",
        );

        const blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "▶️ 再開",
                },
                style: "primary",
                value: session.id,
                action_id: "resume_task",
              },
            ],
          },
        ];

        return sendMessage(
          config,
          session.slackChannel!,
          text,
          session.slackThreadTs!,
          blocks,
        );
      }),

    notifyTaskResumed: (params) =>
      withSlackConfig(params.workspace, async (config) => {
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
      withSlackConfig(params.workspace, async (config) => {
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
