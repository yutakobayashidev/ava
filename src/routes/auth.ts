import { generateState, OAuth2Tokens, Slack } from "arctic";
import { getCookie, setCookie } from "hono/cookie";
import { uuidv7 } from "uuidv7";
import type { Database } from "@/clients/drizzle";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { createHonoApp } from "@/app/create-app";
import { absoluteUrl } from "@/lib/utils";
import { cors } from "hono/cors";

const app = createHonoApp().use(
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

const slackClientId = process.env.SLACK_APP_CLIENT_ID!;
const slackClientSecret = process.env.SLACK_APP_CLIENT_SECRET!;
const slackRedirectUri = absoluteUrl("/api/login/slack/callback");

export const slack = new Slack(
  slackClientId,
  slackClientSecret,
  slackRedirectUri,
);

app.get("/slack", async (c) => {
  const state = generateState();
  const url = slack.createAuthorizationURL(state, [
    "openid",
    "profile",
    "email",
  ]);

  setCookie(c, "slack_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
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

type SlackUser = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
};

async function getSlackUser(tokens: OAuth2Tokens): Promise<SlackUser> {
  const { WebClient } = await import("@slack/web-api");
  const client = new WebClient(tokens.accessToken());

  const result = await client.openid.connect.userInfo();

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error || "Unknown error"}`);
  }

  if (!result.sub || !result.email || !result.name || !result.picture) {
    throw new Error("Missing required user information from Slack");
  }

  return {
    sub: result.sub,
    email: result.email,
    email_verified: result.email_verified ?? false,
    name: result.name,
    picture: result.picture,
  };
}

export function generateSessionToken(): string {
  const tokenBytes = new Uint8Array(20);
  crypto.getRandomValues(tokenBytes);
  const token = encodeBase32(tokenBytes).toLowerCase();
  return token;
}

export type Session = typeof schema.sessions.$inferSelect;

export async function createSession(
  db: Database,
  token: string,
  userId: string,
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const [session] = await db
    .insert(schema.sessions)
    .values({
      id: sessionId,
      userId,
      expiresAt,
    })
    .returning();

  if (!session) {
    throw new Error("Failed to create session");
  }

  return session;
}

app.get("/slack/callback", async (c) => {
  const { code, state } = c.req.query();
  const storedState = getCookie(c, "slack_oauth_state");

  if (
    !storedState ||
    !state ||
    storedState !== state ||
    typeof code !== "string"
  ) {
    return c.text("Bad request", 400);
  }

  let tokens: OAuth2Tokens;
  try {
    tokens = await slack.validateAuthorizationCode(code);
  } catch {
    // Invalid code or client credentials
    return new Response("Please restart the process.", {
      status: 400,
    });
  }
  const slackUser = await getSlackUser(tokens);

  const db = c.get("db");
  let [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.slackId, slackUser.sub));

  if (!existingUser) {
    const [newUser] = await db
      .insert(schema.users)
      .values({
        id: uuidv7(),
        slackId: slackUser.sub,
        email: slackUser.email,
        name: slackUser.name,
        image: slackUser.picture,
      })
      .returning();

    existingUser = newUser;
  }

  if (!existingUser) {
    return c.text("Failed to create user", 500);
  }

  const sessionToken = generateSessionToken();
  const session = await createSession(db, sessionToken, existingUser.id);

  setCookie(c, "session", sessionToken, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: session.expiresAt,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
    },
  });
});

export default app;
