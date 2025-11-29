import { getCookie, deleteCookie } from "hono/cookie";

import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { createWorkspaceRepository } from "@/repos";
import { exchangeSlackInstallCode } from "@/lib/slackInstall";
import { validateSessionToken } from "@/lib/session";
import { verifySlackSignature } from "@/middleware/slack";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import dailyReportInteraction from "@/interactions/daily-report";
import { handleApplicationCommands } from "@/interactions/handleSlackCommands";
import { env } from "hono/adapter";

const app = createHonoApp();

const STATE_COOKIE = "slack_install_state";

const redirectWithMessage = (
  req: Request,
  path: string,
  params: Record<string, string>,
) => {
  const base = new URL(req.url).origin;
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return url.toString();
};

app.get("/install/callback", async (ctx) => {
  const sessionToken = getCookie(ctx, "session");

  const { user } = sessionToken
    ? await validateSessionToken(sessionToken)
    : { user: null };
  if (!user) {
    return ctx.redirect("/login?callbackUrl=/slack/install");
  }

  const code = ctx.req.query("code");
  const state = ctx.req.query("state");
  const storedState = getCookie(ctx, STATE_COOKIE);
  const { NODE_ENV } = env(ctx);

  if (!code) {
    return ctx.redirect(
      redirectWithMessage(ctx.req.raw, "/slack/install", {
        error: "missing_code",
      }),
    );
  }

  if (!storedState || storedState !== state) {
    return ctx.redirect(
      redirectWithMessage(ctx.req.raw, "/slack/install", {
        error: "state_mismatch",
      }),
    );
  }

  try {
    const oauthResult = await exchangeSlackInstallCode(code);
    const db = ctx.get("db");
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
      await workspaceRepository.addMember({
        workspaceId: existing.id,
        userId: user.id,
      });
    } else {
      const workspace = await workspaceRepository.createWorkspace({
        provider: "slack",
        externalId: oauthResult.teamId,
        name: oauthResult.teamName,
        domain: oauthResult.teamDomain ?? null,
        botUserId: oauthResult.botUserId ?? null,
        botAccessToken: oauthResult.accessToken,
        botRefreshToken: oauthResult.refreshToken ?? null,
        installedAt: new Date(),
      });
      await workspaceRepository.addMember({
        workspaceId: workspace.id,
        userId: user.id,
      });
    }

    deleteCookie(ctx, STATE_COOKIE, {
      path: "/",
      sameSite: "lax",
      secure: NODE_ENV === "production",
    });

    return ctx.redirect(
      redirectWithMessage(ctx.req.raw, "/onboarding/connect-slack", {
        installed: "1",
        team: oauthResult.teamName,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    return ctx.redirect(
      redirectWithMessage(ctx.req.raw, "/slack/install", { error: message }),
    );
  }
});

app.post(
  "/commands",
  verifySlackSignature,
  zValidator(
    "form",
    z.object({
      api_app_id: z.string(),
      team_id: z.string(),
      user_id: z.string(),
      channel_id: z.string(),
      text: z.string().optional(),
      command: z.enum(["/daily-report"]),
    }),
  ),
  async (ctx) => {
    const { team_id: teamId, user_id: userId, command } = ctx.req.valid("form");

    const result = await handleApplicationCommands({
      command,
      teamId,
      userId,
      commands: [dailyReportInteraction],
      ctx: getUsecaseContext(ctx),
    });

    return ctx.json(result);
  },
);

export default app;
