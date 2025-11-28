import { getCookie, deleteCookie } from "hono/cookie";

import { createHonoApp } from "@/app/factory";
import { db } from "@/clients/drizzle";
import { createWorkspaceRepository } from "@/repos";
import { exchangeSlackInstallCode } from "@/lib/slackInstall";
import { validateSessionToken } from "@/lib/session";

const app = createHonoApp();

const STATE_COOKIE = "slack_install_state";

const redirectWithMessage = (req: Request, path: string, params: Record<string, string>) => {
    const base = new URL(req.url).origin;
    const url = new URL(path, base);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
};

app.get("/install/callback", async (c) => {
    const sessionToken = getCookie(c, "session");

    const { user } = sessionToken ? await validateSessionToken(sessionToken) : { user: null };
    if (!user) {
        return c.redirect("/login?callbackUrl=/slack/install");
    }

    const code = c.req.query("code");
    const state = c.req.query("state");
    const storedState = getCookie(c, STATE_COOKIE);

    if (!code) {
        return c.redirect(
            redirectWithMessage(c.req.raw, "/slack/install", { error: "missing_code" }),
        );
    }

    if (!storedState || storedState !== state) {
        return c.redirect(
            redirectWithMessage(c.req.raw, "/slack/install", { error: "state_mismatch" }),
        );
    }

    try {
        const oauthResult = await exchangeSlackInstallCode(code);
        const workspaceRepository = createWorkspaceRepository({ db });

        const existing = await workspaceRepository.findWorkspaceByExternalId({
            provider: "slack",
            externalId: oauthResult.teamId,
        });

        if (existing) {
            await workspaceRepository.updateWorkspaceCredentials({
                workspaceId: existing.id,
                botUserId: oauthResult.botUserId ?? null,
                botAccessToken: oauthResult.accessToken,
                botRefreshToken: oauthResult.refreshToken ?? null,
                name: oauthResult.teamName,
                domain: oauthResult.teamDomain ?? existing.domain,
            });
        } else {
            await workspaceRepository.createWorkspace({
                provider: "slack",
                externalId: oauthResult.teamId,
                name: oauthResult.teamName,
                domain: oauthResult.teamDomain ?? null,
                botUserId: oauthResult.botUserId ?? null,
                botAccessToken: oauthResult.accessToken,
                botRefreshToken: oauthResult.refreshToken ?? null,
                installedAt: new Date(),
            });
        }

        deleteCookie(c, STATE_COOKIE, {
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        return c.redirect(
            redirectWithMessage(c.req.raw, "/onboarding/connect-slack", {
                installed: "1",
                team: oauthResult.teamName,
            }),
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "oauth_failed";
        return c.redirect(
            redirectWithMessage(c.req.raw, "/slack/install", { error: message }),
        );
    }
});

export default app;
