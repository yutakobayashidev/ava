import type { Env } from "@/app/create-app";
import { createWorkspaceRepository } from "@/repos";
import {
  exchangeSlackInstallCode,
  getTeamIcon,
  type SlackOAuthConfig,
} from "@ava/integrations/slack";
import * as schema from "@ava/database/schema";
import { eq } from "drizzle-orm";
import { absoluteUrl } from "@/lib/utils";

type InstallWorkspace = {
  code: string;
  userId: string;
};

type InstallWorkspaceResult =
  | { success: true; teamName: string }
  | { success: false; error: string };

export const installWorkspace = async (
  params: InstallWorkspace,
  ctx: Env["Variables"],
): Promise<InstallWorkspaceResult> => {
  const { code, userId } = params;
  const { db } = ctx;

  const slackConfig: SlackOAuthConfig = {
    clientId: process.env.SLACK_APP_CLIENT_ID,
    clientSecret: process.env.SLACK_APP_CLIENT_SECRET,
    redirectUri: absoluteUrl("/api/slack/install/callback"),
  };

  try {
    const oauthResult = await exchangeSlackInstallCode(slackConfig, code);
    const workspaceRepository = createWorkspaceRepository({ db });

    // ログイン中のユーザーを取得
    const [currentUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!currentUser) {
      return {
        success: false,
        error: "user_not_found",
      };
    }

    // ユーザーの slackTeamId とボットインストール先の teamId が一致するか検証
    if (currentUser.slackTeamId !== oauthResult.teamId) {
      return {
        success: false,
        error: "team_mismatch",
      };
    }

    // アイコンURLを取得
    const iconUrl = await getTeamIcon(oauthResult.accessToken);

    const existing = await workspaceRepository.findWorkspaceByExternalId({
      provider: "slack",
      externalId: oauthResult.teamId,
    });

    let workspaceId: string;

    if (existing) {
      // 既存ワークスペースの更新
      await workspaceRepository.updateWorkspaceCredentials({
        workspaceId: existing.id,
        botUserId: oauthResult.botUserId ?? null,
        botAccessToken: oauthResult.accessToken,
        botRefreshToken: oauthResult.refreshToken ?? null,
        botTokenExpiresAt: oauthResult.expiresAt,
        name: oauthResult.teamName,
        domain: oauthResult.teamDomain ?? existing.domain,
        iconUrl,
      });
      workspaceId = existing.id;
    } else {
      // 新規ワークスペースの作成
      const workspace = await workspaceRepository.createWorkspace({
        provider: "slack",
        externalId: oauthResult.teamId,
        name: oauthResult.teamName,
        domain: oauthResult.teamDomain ?? null,
        iconUrl,
        botUserId: oauthResult.botUserId ?? null,
        botAccessToken: oauthResult.accessToken,
        botRefreshToken: oauthResult.refreshToken ?? null,
        botTokenExpiresAt: oauthResult.expiresAt,
        installedAt: new Date(),
      });
      workspaceId = workspace.id;
    }

    // 同じ slackTeamId を持つ全ユーザーをワークスペースに紐付け
    await workspaceRepository.setWorkspaceForAllTeamUsers(
      oauthResult.teamId,
      workspaceId,
    );

    return {
      success: true,
      teamName: oauthResult.teamName,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "oauth_failed",
    };
  }
};
