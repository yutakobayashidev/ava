import type { Env } from "@/app/create-app";
import { createWorkspaceRepository } from "@/repos";
import { exchangeSlackInstallCode } from "@/lib/slackInstall";
import { getTeamIcon } from "@/clients/slack";

export type InstallWorkspace = {
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

  try {
    const oauthResult = await exchangeSlackInstallCode(code);
    const workspaceRepository = createWorkspaceRepository({ db });

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

    // ユーザーにワークスペースを設定
    await workspaceRepository.setUserWorkspace(userId, workspaceId);

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
