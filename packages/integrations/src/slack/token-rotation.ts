import "server-only";

import { WebClient } from "@slack/web-api";
import type { RotatedTokens, TokenRotationParams } from "./types";

const DEFAULT_MINUTES_BEFORE_EXPIRATION = 120; // 2 hours

const createWebClient = (token?: string): WebClient => {
  return new WebClient(token);
};

/**
 * Slack bot token rotation
 * @param botRefreshToken Current bot refresh token
 * @param botTokenExpiresAt Expiration timestamp of the current token
 * @param clientId Slack app client ID
 * @param clientSecret Slack app client secret
 * @param minutesBeforeExpiration Minutes before expiration to trigger rotation (default: 120)
 * @returns Rotated tokens if rotation was necessary, null otherwise
 */
export const performBotTokenRotation = async ({
  botRefreshToken,
  botTokenExpiresAt,
  clientId,
  clientSecret,
  minutesBeforeExpiration = DEFAULT_MINUTES_BEFORE_EXPIRATION,
}: TokenRotationParams): Promise<RotatedTokens | null> => {
  // If no expiration time is set, no rotation is needed (legacy token)
  if (!botTokenExpiresAt) {
    return null;
  }

  // If token is not expiring soon, no rotation is needed
  const now = new Date();
  const expirationThreshold = new Date(
    now.getTime() + minutesBeforeExpiration * 60 * 1000,
  );

  if (botTokenExpiresAt > expirationThreshold) {
    return null;
  }

  // Ensure we have a refresh token
  if (!botRefreshToken) {
    throw new Error("No refresh token available for token rotation");
  }

  // Perform token rotation using Slack Web API
  const client = createWebClient();

  const response = await client.oauth.v2.access({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: botRefreshToken,
  });

  if (!response.ok) {
    throw new Error(
      `Slack token rotation failed: ${response.error ?? "unknown_error"}`,
    );
  }

  if (
    !response.access_token ||
    !response.refresh_token ||
    !response.expires_in
  ) {
    throw new Error("Invalid token rotation response from Slack");
  }

  const expiresAt = new Date(
    now.getTime() + (response.expires_in as number) * 1000,
  );

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt,
  };
};

/**
 * Get a valid Slack bot token, rotating if necessary
 */
export const getValidBotToken = async ({
  botAccessToken,
  botRefreshToken,
  botTokenExpiresAt,
  clientId,
  clientSecret,
  onTokenRotated,
}: {
  botAccessToken: string | null;
  botRefreshToken: string | null;
  botTokenExpiresAt: Date | null;
  clientId: string;
  clientSecret: string;
  onTokenRotated?: (rotatedTokens: RotatedTokens) => Promise<void>;
}): Promise<string> => {
  if (!botAccessToken) {
    throw new Error("No bot access token available");
  }

  const rotatedTokens = await performBotTokenRotation({
    botRefreshToken,
    botTokenExpiresAt,
    clientId,
    clientSecret,
  });

  if (rotatedTokens) {
    // Token was rotated, call the callback to update the database
    if (onTokenRotated) {
      await onTokenRotated(rotatedTokens);
    }
    return rotatedTokens.accessToken;
  }

  // Token is still valid
  return botAccessToken;
};
