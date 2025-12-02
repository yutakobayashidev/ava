import { generateState } from "arctic";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { env } from "hono/adapter";
import { slack } from "@/lib/oauth";
import { loginWithSlack } from "@/usecases/auth/loginWithSlack";
import { invalidateSession, validateSessionToken } from "@/lib/session";
import { HTTPException } from "hono/http-exception";

const app = createHonoApp()
  .get("/slack", async (c) => {
    const { NODE_ENV } = env(c);
    const state = generateState();
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

    return c.redirect(url.toString());
  })
  .get("/slack/callback", async (c) => {
    const { code, state } = c.req.query();
    const storedState = getCookie(c, "slack_oauth_state");
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

    return c.redirect("/");
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
