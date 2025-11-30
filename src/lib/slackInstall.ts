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

type SlackInstallConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

export const getSlackInstallConfig = (): SlackInstallConfig => {
  const clientId = process.env.SLACK_APP_CLIENT_ID!;
  const clientSecret = process.env.SLACK_APP_CLIENT_SECRET!;
  const redirectUri = absoluteUrl("/api/slack/install/callback");

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: DEFAULT_SCOPES,
  };
};

export const buildSlackInstallUrl = (state: string): string => {
  const config = getSlackInstallConfig();

  const url = new URL(SLACK_OAUTH_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scopes.join(","));
  url.searchParams.set("state", state);

  return url.toString();
};

export const exchangeSlackInstallCode = async (code: string) => {
  const config = getSlackInstallConfig();
  const client = new WebClient();

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
