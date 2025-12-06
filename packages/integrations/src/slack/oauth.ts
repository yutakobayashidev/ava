import "server-only";

import { WebClient } from "@slack/web-api";
import type { SlackOAuthResult } from "./types";

const SLACK_OAUTH_ENDPOINT = "https://slack.com/oauth/v2/authorize";

const createWebClient = (): WebClient => {
  return new WebClient();
};

export const DEFAULT_SLACK_SCOPES = [
  "channels:read",
  "chat:write",
  "chat:write.public",
  "commands",
  "groups:read",
  "reactions:write",
  "team:read",
] as const;

export type SlackOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
};

export const buildSlackInstallUrl = (
  config: SlackOAuthConfig,
  state: string,
): string => {
  const url = new URL(SLACK_OAUTH_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set(
    "scope",
    (config.scopes ?? DEFAULT_SLACK_SCOPES).join(","),
  );
  url.searchParams.set("state", state);
  return url.toString();
};

export const exchangeSlackInstallCode = async (
  config: SlackOAuthConfig,
  code: string,
): Promise<SlackOAuthResult> => {
  const client = createWebClient();

  const response = await client.oauth.v2.access({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  });

  if (!response.ok) {
    throw new Error(`Slack OAuth error: ${response.error ?? "unknown_error"}`);
  }

  if (!response.access_token) {
    throw new Error("No access token returned from Slack");
  }

  const expiresAt = response.expires_in
    ? new Date(Date.now() + Number(response.expires_in) * 1000)
    : null;

  const team = response.team as
    | { id?: string; name?: string; domain?: string }
    | undefined;

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in ? Number(response.expires_in) : undefined,
    expiresAt,
    botUserId: response.bot_user_id,
    teamId: team?.id ?? "unknown",
    teamName: team?.name ?? "unknown",
    teamDomain: team?.domain,
    scope: response.scope,
  };
};
