import { createMiddleware } from "hono/factory";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { Context } from "hono";
import type { Env } from "@/app/create-app";
import { HTTPException } from "hono/http-exception";
import type { Database } from "@/clients/drizzle";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";

type AuthContext = {
  user: typeof schema.users.$inferSelect;
  workspace: typeof schema.workspaces.$inferSelect;
};

async function findUserAndWorkspaceByToken(
  token: string,
  db: Database,
): Promise<AuthContext | null> {
  const tokenHash = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const [accessToken] = await db
    .select()
    .from(schema.accessTokens)
    .where(eq(schema.accessTokens.tokenHash, tokenHash));

  if (!accessToken) return null;
  if (accessToken.expiresAt.getTime() < Date.now()) return null;
  if (!accessToken.workspaceId) return null;

  const [[user], [workspace], [membership]] = await Promise.all([
    db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, accessToken.userId)),
    db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, accessToken.workspaceId)),
    db
      .select()
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, accessToken.workspaceId),
          eq(schema.workspaceMembers.userId, accessToken.userId),
        ),
      )
      .limit(1),
  ]);

  if (!user || !workspace || !membership) return null;

  return { user, workspace };
}

function getToken(c: Context<Env>) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}

export const oauthMiddleware = createMiddleware<Env>(async (c, next) => {
  const token = getToken(c);
  if (!token) throw new HTTPException(401, { message: "Unauthorized" });

  const db = c.get("db");
  const auth = await findUserAndWorkspaceByToken(token, db);
  if (!auth) throw new HTTPException(401, { message: "Unauthorized" });

  c.set("user", auth.user);
  c.set("workspace", auth.workspace);
  return next();
});
