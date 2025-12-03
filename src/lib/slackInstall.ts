import "server-only";

import { WebClient } from "@slack/web-api";
import { absoluteUrl } from "./utils";

const SLACK_OAUTH_ENDPOINT = "https://slack.com/oauth/v2/authorize";

const DEFAULT_SCOPES = [
  "channels:read",
  "chat:write",
  "chat:write.public",
  "commands",
  "groups:read",
  "reactions:write",
  "team:read",
];

export const slackConfig = {
  clientId: process.env.SLACK_APP_CLIENT_ID,
  clientSecret: process.env.SLACK_APP_CLIENT_SECRET,
  redirectUri: absoluteUrl("/api/slack/install/callback"),
  scopes: DEFAULT_SCOPES,
} as const;

export const buildSlackInstallUrl = (state: string): string => {
  const url = new URL(SLACK_OAUTH_ENDPOINT);
  url.searchParams.set("client_id", slackConfig.clientId);
  url.searchParams.set("redirect_uri", slackConfig.redirectUri);
  url.searchParams.set("scope", slackConfig.scopes.join(","));
  url.searchParams.set("state", state);
  return url.toString();
};

export const exchangeSlackInstallCode = async (code: string) => {
  const client = new WebClient();

  const response = await client.oauth.v2.access({
    client_id: slackConfig.clientId,
    client_secret: slackConfig.clientSecret,
    code,
    redirect_uri: slackConfig.redirectUri,
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
