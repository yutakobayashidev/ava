import "server-only";

import { getWorkspaceBotToken } from "@/lib/slack";
import type { WorkspaceRepository } from "@/repos";
import type { Workspace } from "@ava/database/schema";
import { addReaction, postMessage } from "@ava/integrations/slack";
import type { Block } from "@slack/web-api";

/**
 * 通知の配信結果
 */
export type NotificationResult = {
  delivered: boolean;
  channel?: string;
  threadTs?: string;
  error?: string;
};

/**
 * メッセージ内容
 */
export type SlackMessage = {
  text: string;
  blocks?: Block[];
};

/**
 * SlackNotificationService
 * - Slack APIへのメッセージ配送のみを担当
 * - メッセージ文言の組み立てはユースケース層で行う
 */
export type SlackNotificationService = {
  /**
   * メッセージを投稿
   */
  postMessage: (params: {
    workspace: Workspace;
    channel: string;
    message: SlackMessage;
    threadTs?: string;
  }) => Promise<NotificationResult>;

  /**
   * リアクションを追加
   */
  addReaction: (params: {
    workspace: Workspace;
    channel: string;
    timestamp: string;
    emoji: string;
  }) => Promise<NotificationResult>;
};

/**
 * SlackNotificationServiceを作成
 */
export const createSlackNotificationService = (
  workspaceRepository: WorkspaceRepository,
): SlackNotificationService => {
  /**
   * Workspace設定をチェック
   */
  const validateWorkspaceConfig = (
    workspace: Workspace,
  ): { valid: boolean; error?: string } => {
    if (!workspace.botAccessToken || !workspace.notificationChannelId) {
      return {
        valid: false,
        error: "Slack bot token or notification channel is not configured",
      };
    }
    return { valid: true };
  };

  return {
    postMessage: async ({ workspace, channel, message, threadTs }) => {
      // 設定チェック
      const validation = validateWorkspaceConfig(workspace);
      if (!validation.valid) {
        return {
          delivered: false,
          error: validation.error,
        };
      }

      try {
        // トークンローテーション
        const validToken = await getWorkspaceBotToken({
          workspace,
          workspaceRepository,
        });

        // メッセージ投稿
        const result = await postMessage({
          token: validToken,
          channel,
          text: message.text,
          threadTs,
          blocks: message.blocks,
        });

        return {
          delivered: true,
          channel: result.channel,
          threadTs: result.ts,
        };
      } catch (error) {
        console.error("Failed to post Slack message", error);
        return {
          delivered: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },

    addReaction: async ({ workspace, channel, timestamp, emoji }) => {
      // 設定チェック
      const validation = validateWorkspaceConfig(workspace);
      if (!validation.valid) {
        return {
          delivered: false,
          error: validation.error,
        };
      }

      try {
        // トークンローテーション
        const validToken = await getWorkspaceBotToken({
          workspace,
          workspaceRepository,
        });

        // リアクション追加
        await addReaction({
          token: validToken,
          channel,
          timestamp,
          name: emoji,
        });

        return {
          delivered: true,
        };
      } catch (error) {
        console.error("Failed to add Slack reaction", error);
        return {
          delivered: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
};
