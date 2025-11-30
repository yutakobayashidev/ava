import { getCookie, deleteCookie } from "hono/cookie";

import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { validateSessionToken } from "@/lib/session";
import { verifySlackSignature } from "@/middleware/slack";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import dailyReportInteraction from "@/interactions/daily-report";
import { handleApplicationCommands } from "@/interactions/handleSlackCommands";
import { env } from "hono/adapter";
import { installWorkspace } from "@/usecases/slack/installWorkspace";
import { buildRedirectUrl } from "@/utils/urls";

const app = createHonoApp();

const STATE_COOKIE = "slack_install_state";

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
      buildRedirectUrl(ctx.req.raw, "/slack/install", {
        error: "missing_code",
      }),
    );
  }

  if (!storedState || storedState !== state) {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, "/slack/install", {
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
      buildRedirectUrl(ctx.req.raw, "/onboarding/connect-slack", {
        installed: "1",
        team: result.teamName,
      }),
    );
  } else {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, "/slack/install", {
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
