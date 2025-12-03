import { generateState } from "arctic";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { validateSessionToken } from "@/lib/session";
import { buildGoogleDriveAuthUrl } from "@/lib/googleDrive";
import { connectGoogleDriveAccount } from "@/usecases/google-drive/connectAccount";
import { exportJournalToGoogleDrive } from "@/usecases/google-drive/exportJournal";
import { buildRedirectUrl } from "@/utils/urls";
import { env } from "hono/adapter";

const app = createHonoApp();

const STATE_COOKIE = "google_drive_state";

app.get("/connect/start", async (ctx) => {
  const sessionToken = getCookie(ctx, "session");

  const { user } = sessionToken
    ? await validateSessionToken(sessionToken)
    : { user: null };
  if (!user) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }

  const state = generateState();
  const authorizeUrl = buildGoogleDriveAuthUrl(state);
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

app.get("/connect/callback", async (ctx) => {
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

  const fallbackPath = "/settings";

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

  const result = await connectGoogleDriveAccount(
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
        connected: "google_drive",
        email: result.email,
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
  "/export/journal",
  zValidator(
    "json",
    z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    }),
  ),
  async (ctx) => {
    const sessionToken = getCookie(ctx, "session");

    const { user } = sessionToken
      ? await validateSessionToken(sessionToken)
      : { user: null };
    if (!user) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const { date } = ctx.req.valid("json");

    const result = await exportJournalToGoogleDrive(
      {
        userId: user.id,
        date,
      },
      getUsecaseContext(ctx),
    );

    if (result.success) {
      return ctx.json({
        success: true,
        webViewLink: result.webViewLink,
      });
    } else {
      return ctx.json(
        {
          success: false,
          error: result.error,
        },
        400,
      );
    }
  },
);

export default app;
