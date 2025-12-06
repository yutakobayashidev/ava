import "server-only";

import type { Workspace } from "@ava/database/schema";
import type { WorkspaceRepository } from "@/repos/workspaces";
import { getValidBotToken } from "@ava/integrations/slack";

type GetWorkspaceBotTokenParams = {
  workspace: Workspace;
  workspaceRepository: WorkspaceRepository;
};

/**
 * Get a valid bot token for the workspace, rotating if necessary
 * This is a thin wrapper around getValidBotToken that integrates with our repository layer
 */
export const getWorkspaceBotToken = async ({
  workspace,
  workspaceRepository,
}: GetWorkspaceBotTokenParams): Promise<string> => {
  return getValidBotToken({
    botAccessToken: workspace.botAccessToken,
    botRefreshToken: workspace.botRefreshToken,
    botTokenExpiresAt: workspace.botTokenExpiresAt,
    clientId: process.env.SLACK_APP_CLIENT_ID,
    clientSecret: process.env.SLACK_APP_CLIENT_SECRET,
    onTokenRotated: async (rotatedTokens) => {
      await workspaceRepository.updateWorkspaceCredentials({
        workspaceId: workspace.id,
        botAccessToken: rotatedTokens.accessToken,
        botRefreshToken: rotatedTokens.refreshToken,
        botTokenExpiresAt: rotatedTokens.expiresAt,
      });
    },
  });
};
