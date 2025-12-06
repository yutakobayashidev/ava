import "server-only";

import { cookies } from "next/headers";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { eq } from "drizzle-orm";
import { db } from "@ava/database/client";
import * as schema from "@ava/database/schema";

export async function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const [result] = await db
    .select()
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sessionId));

  if (!result) {
    return { session: null, user: null };
  }

  const session = { ...result.sessions };
  const user = result.users;

  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
    return { session: null, user: null };
  }

  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    session.expiresAt = newExpiresAt;
    await db
      .update(schema.sessions)
      .set({ expiresAt: newExpiresAt })
      .where(eq(schema.sessions.id, session.id));
  }

  return { session, user };
}

export const getCurrentSession = async () => {
  const token = (await cookies()).get("session")?.value ?? null;
  if (token === null) {
    return { session: null, user: null };
  }
  const result = await validateSessionToken(token);
  return result;
};

export async function invalidateSession(sessionId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}
