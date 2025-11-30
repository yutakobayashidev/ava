import type { Env } from "@/app/create-app";
import type { OAuth2Tokens } from "arctic";
import { slack } from "@/lib/oauth";
import * as schema from "@/db/schema";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { createUserRepository } from "@/repos/users";

export type LoginWithSlack = {
  code: string;
};

type SlackUser = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  team_id: string;
};

type LoginWithSlackResult =
  | {
      success: true;
      sessionToken: string;
      session: typeof schema.sessions.$inferSelect;
    }
  | { success: false; error: "invalid_code" | "user_creation_failed" };

async function getSlackUser(tokens: OAuth2Tokens): Promise<SlackUser> {
  const { WebClient } = await import("@slack/web-api");
  const client = new WebClient(tokens.accessToken());

  const result = await client.openid.connect.userInfo();

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error || "Unknown error"}`);
  }

  const teamId = result["https://slack.com/team_id"];

  if (
    !result.sub ||
    !result.email ||
    !result.name ||
    !result.picture ||
    !teamId
  ) {
    throw new Error("Missing required user information from Slack");
  }

  return {
    sub: result.sub,
    email: result.email,
    email_verified: result.email_verified ?? false,
    name: result.name,
    picture: result.picture,
    team_id: teamId,
  };
}

export function generateSessionToken(): string {
  const tokenBytes = new Uint8Array(20);
  crypto.getRandomValues(tokenBytes);
  const token = encodeBase32(tokenBytes).toLowerCase();
  return token;
}

export async function createSession(
  db: Env["Variables"]["db"],
  token: string,
  userId: string,
): Promise<typeof schema.sessions.$inferSelect> {
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

export const loginWithSlack = async (
  params: LoginWithSlack,
  ctx: Env["Variables"],
): Promise<LoginWithSlackResult> => {
  const { code } = params;
  const { db } = ctx;

  // Slack OAuth トークン検証
  let tokens: OAuth2Tokens;
  try {
    tokens = await slack.validateAuthorizationCode(code);
  } catch {
    return { success: false, error: "invalid_code" };
  }

  // Slack ユーザー情報取得
  const slackUser = await getSlackUser(tokens);

  // ユーザーの検索または作成（slackId + slackTeamId で一意）
  const userRepository = createUserRepository({ db });
  let existingUser = await userRepository.findUserBySlackIdAndTeamId(
    slackUser.sub,
    slackUser.team_id,
  );

  if (!existingUser) {
    existingUser = await userRepository.createUser({
      provider: "slack",
      externalId: slackUser.sub,
      name: slackUser.name,
      email: slackUser.email,
      slackId: slackUser.sub,
      slackTeamId: slackUser.team_id,
      image: slackUser.picture,
    });
  }

  if (!existingUser) {
    return { success: false, error: "user_creation_failed" };
  }

  // セッション作成
  const sessionToken = generateSessionToken();
  const session = await createSession(db, sessionToken, existingUser.id);

  return {
    success: true,
    sessionToken,
    session,
  };
};
