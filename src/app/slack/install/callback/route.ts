import { NextRequest, NextResponse } from "next/server";

import { db } from "@/src/clients/drizzle";
import { exchangeSlackInstallCode, getSlackInstallConfig } from "@/src/lib/slackInstall";
import { getCurrentSession } from "@/src/lib/session";
import { createWorkspaceRepository } from "@/src/repos";

const STATE_COOKIE = "slack_install_state";

const redirectWithMessage = (path: string, params: Record<string, string>) => {
    const url = new URL(path, "https://localhost:3000");
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
};

export async function GET(request: NextRequest) {
    const { user } = await getCurrentSession();
    if (!user) {
        return NextResponse.redirect("/login?callbackUrl=/slack/install");
    }

    const config = getSlackInstallConfig();
    if (!config) {
        return NextResponse.redirect("/slack/install?error=missing_config");
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    const storedState = request.cookies.get(STATE_COOKIE)?.value;

    if (!code) {
        return NextResponse.redirect(redirectWithMessage("/slack/install", { error: "missing_code" }));
    }

    if (!storedState || storedState !== state) {
        return NextResponse.redirect(
            redirectWithMessage("/slack/install", { error: "state_mismatch" }),
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

        const response = NextResponse.redirect(
            redirectWithMessage("/onboarding/connect-slack", {
                installed: "1",
                team: oauthResult.teamName,
            }),
        );
        response.cookies.delete(STATE_COOKIE);
        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "oauth_failed";
        return NextResponse.redirect(
            redirectWithMessage("/slack/install", { error: message }),
        );
    }
}
