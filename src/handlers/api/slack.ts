import { generateState } from "arctic";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { validateSessionToken } from "@/lib/session";
import { buildSlackInstallUrl } from "@/lib/slackInstall";
import { installWorkspace } from "@/usecases/slack/installWorkspace";
import { buildRedirectUrl } from "@/utils/urls";
import { env } from "hono/adapter";
import { verifySlackSignature } from "@/middleware/slack";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import dailyReportInteraction from "@/interactions/daily-report";
import { handleApplicationCommands } from "@/interactions/handleSlackCommands";

const app = createHonoApp();

const STATE_COOKIE = "slack_install_state";

app.get("/install/start", async (ctx) => {
  const sessionToken = getCookie(ctx, "session");

  const { user } = sessionToken
    ? await validateSessionToken(sessionToken)
    : { user: null };
  if (!user) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }

  const state = generateState();
  const authorizeUrl = buildSlackInstallUrl(state);
  const { NODE_ENV } = env(ctx);

  setCookie(ctx, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return ctx.redirect(authorizeUrl);
});

app.get("/install/callback", async (ctx) => {
  const sessionToken = getCookie(ctx, "session");

  const { user } = sessionToken
    ? await validateSessionToken(sessionToken)
    : { user: null };
  if (!user) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }

  const code = ctx.req.query("code");
  const state = ctx.req.query("state");
  const storedState = getCookie(ctx, STATE_COOKIE);
  const { NODE_ENV } = env(ctx);

  // オンボーディング完了済みかどうかで戻り先を決定
  const isOnboarding = !user.onboardingCompletedAt;
  const fallbackPath = isOnboarding ? "/onboarding/connect-slack" : "/settings";

  if (!code) {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, fallbackPath, {
        error: "missing_code",
      }),
    );
  }

  if (!storedState || storedState !== state) {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, fallbackPath, {
        error: "state_mismatch",
      }),
    );
  }

  const result = await installWorkspace(
    {
      code,
      userId: user.id,
    },
    getUsecaseContext(ctx),
  );

  // Cookie削除（成功/失敗に関わらず）
  deleteCookie(ctx, STATE_COOKIE, {
    path: "/",
    sameSite: "lax",
    secure: NODE_ENV === "production",
  });

  // 結果に応じてリダイレクト
  if (result.success) {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, fallbackPath, {
        installed: "1",
        team: result.teamName,
      }),
    );
  } else {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, fallbackPath, {
        error: result.error,
      }),
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
