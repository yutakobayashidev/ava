import { generateState } from "arctic";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { env } from "hono/adapter";
import { slack } from "@/lib/oauth";
import { loginWithSlack } from "@/usecases/auth/loginWithSlack";
import { invalidateSession, validateSessionToken } from "@/lib/session";
import { HTTPException } from "hono/http-exception";
import { absoluteUrl } from "@/lib/utils";

const app = createHonoApp()
  .get("/slack", async (c) => {
    const { NODE_ENV } = env(c);
    const state = generateState();
    const { callbackUrl } = c.req.query();
    const url = slack.createAuthorizationURL(state, [
      "openid",
      "profile",
      "email",
    ]);

    setCookie(c, "slack_oauth_state", state, {
      path: "/",
      secure: NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    });

    // ログイン後に戻るべきURLを保持（同一オリジンのみ許容）
    if (callbackUrl && typeof callbackUrl === "string") {
      setCookie(c, "slack_oauth_callback", callbackUrl, {
        path: "/",
        secure: NODE_ENV === "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "lax",
      });
    }

    return c.redirect(url.toString());
  })
  .get("/slack/callback", async (c) => {
    const { code, state } = c.req.query();
    const storedState = getCookie(c, "slack_oauth_state");
    const callbackUrl = getCookie(c, "slack_oauth_callback");
    const { NODE_ENV } = env(c);

    if (
      !storedState ||
      !state ||
      storedState !== state ||
      typeof code !== "string"
    ) {
      return c.text("Bad request", 400);
    }

    const result = await loginWithSlack({ code }, getUsecaseContext(c));

    if (!result.success) {
      return new Response("Please restart the process.", {
        status: 400,
      });
    }

    setCookie(c, "session", result.sessionToken, {
      httpOnly: true,
      path: "/",
      secure: NODE_ENV === "production",
      sameSite: "lax",
      expires: result.session.expiresAt,
    });

    // callbackが同一オリジンならそこへ戻す
    let redirectUrl = "/";
    if (callbackUrl && typeof callbackUrl === "string") {
      try {
        const baseOrigin = new URL(absoluteUrl("")).origin;
        const url = new URL(callbackUrl, baseOrigin);
        if (url.origin === baseOrigin) {
          redirectUrl = url.toString();
        }
      } catch (_err) {
        // fallback: do nothing, stay at "/"
      }
    }

    setCookie(c, "slack_oauth_callback", "", {
      path: "/",
      maxAge: 0,
    });

    return c.redirect(redirectUrl);
  })
  .post("/logout", async (c) => {
    const token = getCookie(c, "session");

    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { session } = await validateSessionToken(token);
    if (!session) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    await invalidateSession(session.id);

    deleteCookie(c, "session", {
      path: "/",
    });

    return c.json({ success: true });
  });

export type AuthRoute = typeof app;

export default app;
