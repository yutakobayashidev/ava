import { generateState } from "arctic";
import { getCookie, setCookie } from "hono/cookie";
import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { cors } from "hono/cors";
import { env } from "hono/adapter";
import { slack } from "@/lib/oauth";
import { loginWithSlack } from "@/usecases/auth/loginWithSlack";

const app = createHonoApp().use(
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

app.get("/slack", async (c) => {
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

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
    },
  });
});

app.get("/slack/callback", async (c) => {
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

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
    },
  });
});

export default app;
