import type { Env } from "@/app/create-app";
import { createGoogleDriveConnectionRepository } from "@/repos";
import { exchangeGoogleDriveCode } from "@/lib/googleDrive";

type ConnectAccount = {
  code: string;
  userId: string;
};

type ConnectAccountResult =
  | { success: true; email: string }
  | { success: false; error: string };

export const connectGoogleDriveAccount = async (
  params: ConnectAccount,
  ctx: Env["Variables"],
): Promise<ConnectAccountResult> => {
  const { code, userId } = params;
  const { db } = ctx;

  try {
    const oauthResult = await exchangeGoogleDriveCode(code);
    const repository = createGoogleDriveConnectionRepository({ db });

    const existing = await repository.findConnectionByUserId(userId);

    if (existing) {
      // 既存の接続を更新
      await repository.updateConnection({
        userId,
        accessToken: oauthResult.accessToken,
        refreshToken: oauthResult.refreshToken,
        expiresAt: oauthResult.expiresAt,
      });
    } else {
      // 新規接続を作成
      await repository.createConnection({
        userId,
        email: oauthResult.email,
        accessToken: oauthResult.accessToken,
        refreshToken: oauthResult.refreshToken,
        expiresAt: oauthResult.expiresAt,
      });
    }

    return {
      success: true,
      email: oauthResult.email,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "oauth_failed",
    };
  }
};
