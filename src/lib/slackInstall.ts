const SLACK_OAUTH_ENDPOINT = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_ENDPOINT = "https://slack.com/api/oauth.v2.access";

const DEFAULT_SCOPES = ["chat:write", "chat:write.public", "channels:read", "groups:read"];

type SlackInstallConfig =
    | {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        scopes: string[];
    }
    | null;

type SlackOAuthSuccess = {
    access_token: string;
    refresh_token?: string;
    bot_user_id?: string;
    scope?: string;
    team?: {
        id: string;
        name: string;
        domain?: string;
    };
    app_id?: string;
};

type SlackOAuthResponse = ({ ok: true } & SlackOAuthSuccess) | { ok: false; error?: string };

export const getSlackInstallConfig = (): SlackInstallConfig => {
    const clientId = process.env.SLACK_APP_CLIENT_ID;
    const clientSecret = process.env.SLACK_APP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return null;
    }

    const redirectUri = "https://localhost:3000/slack/install/callback";

    return {
        clientId,
        clientSecret,
        redirectUri,
        scopes: DEFAULT_SCOPES,
    };
};

export const buildSlackInstallUrl = (state: string): string | null => {
    const config = getSlackInstallConfig();
    if (!config) return null;

    const url = new URL(SLACK_OAUTH_ENDPOINT);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("scope", config.scopes.join(","));
    url.searchParams.set("state", state);

    return url.toString();
};

export const exchangeSlackInstallCode = async (code: string) => {
    const config = getSlackInstallConfig();
    if (!config) {
        throw new Error("Slack app credentials are not configured");
    }

    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
    });

    const response = await fetch(SLACK_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    const payload = (await response.json()) as SlackOAuthResponse;

    if (!response.ok || !payload.ok) {
        const message = payload.ok ? response.statusText : payload.error ?? "unknown_error";
        throw new Error(`Slack OAuth error: ${message}`);
    }

    return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        botUserId: payload.bot_user_id,
        teamId: payload.team?.id ?? "unknown",
        teamName: payload.team?.name ?? "unknown",
        teamDomain: payload.team?.domain,
        scope: payload.scope,
    };
};
