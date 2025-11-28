import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { getSlackInstallConfig, buildSlackInstallUrl } from "@/lib/slackInstall";
import { getCurrentSession } from "@/lib/session";

const STATE_COOKIE = "slack_install_state";

export async function GET() {
    const { user } = await getCurrentSession();
    if (!user) {
        return NextResponse.redirect("/login?callbackUrl=/slack/install");
    }

    const state = randomBytes(16).toString("hex");
    const config = getSlackInstallConfig();
    const authorizeUrl = buildSlackInstallUrl(state);

    if (!config || !authorizeUrl) {
        return NextResponse.redirect("/slack/install?error=missing_config");
    }

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 600,
    });

    return response;
}
