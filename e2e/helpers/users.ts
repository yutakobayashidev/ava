import type { BrowserContext, TestType } from "@playwright/test";
import type { TestFixtures, WorkerFixtures } from "../fixtures";
import { generateDrizzleClient } from "./drizzle";
import { createSession } from "@/usecases/auth/loginWithSlack";
import { NonNullableUser } from "../dummyUsers";
import { users } from "@/db/schema";
import { encodeBase32 } from "@oslojs/encoding";
import crypto from "node:crypto";

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ユーザーIDから決定的なセッショントークンを生成
function generateDeterministicSessionToken(userId: string): string {
  const hash = crypto.createHash("sha256").update(`session:${userId}`).digest();
  return encodeBase32(hash.subarray(0, 20)).toLowerCase();
}

export async function registerUserToDB(user: NonNullableUser, dbUrl: string) {
  await using drizzle = await generateDrizzleClient(dbUrl);

  await drizzle.db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: user.id,
      name: user.name,
      email: user.email,
      slackId: user.slackId,
      image: user.image,
      onboardingCompletedAt: user.onboardingCompletedAt,
    });
  });
}

export async function createUserAuthState(
  context: BrowserContext,
  user: NonNullableUser,
  dbUrl: string,
) {
  await using drizzle = await generateDrizzleClient(dbUrl);

  const sessionToken = generateDeterministicSessionToken(user.id);
  await createSession(drizzle.db, sessionToken, user.id);

  const expires = Math.round((Date.now() + SESSION_LIFETIME_MS) / 1000);
  const storageStatePath = getStorageStatePath(user.id);

  await context.addCookies([
    {
      name: "session",
      value: sessionToken,
      path: "/",
      domain: "localhost",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      expires,
    },
  ]);

  await context.storageState({
    path: storageStatePath,
  });
}

export async function recreateSession(user: NonNullableUser, dbUrl: string) {
  await using drizzle = await generateDrizzleClient(dbUrl);

  const sessionToken = generateDeterministicSessionToken(user.id);
  await createSession(drizzle.db, sessionToken, user.id);
}

export async function useUser<T extends TestType<TestFixtures, WorkerFixtures>>(
  test: T,
  user: NonNullableUser,
) {
  test.use({ storageState: getStorageStatePath(user.id) });
  test.beforeEach(async ({ setup }) => {
    await registerUserToDB(user, setup.dbURL);
    await recreateSession(user, setup.dbURL);
  });
}

function getStorageStatePath(id: string) {
  return `e2e/.auth/${id}.json`;
}
