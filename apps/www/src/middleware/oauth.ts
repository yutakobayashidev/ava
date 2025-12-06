import { absoluteUrl } from "@/lib/utils";
import type { HonoEnv } from "@/types";
import { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

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

  const [[user], [workspace]] = await Promise.all([
    db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, accessToken.userId)),
    db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, accessToken.workspaceId)),
  ]);

  if (!user || !workspace || user.workspaceId !== accessToken.workspaceId)
    return null;

  return { user, workspace };
}

function getToken(c: Context) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}

function throwUnauthorized(): never {
  const resourceMetadataUrl = absoluteUrl(
    "/.well-known/oauth-protected-resource",
  );
  throw new HTTPException(401, {
    res: new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
        "Content-Type": "application/json",
      },
    }),
  });
}

export const oauthMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const token = getToken(c);
  if (!token) throwUnauthorized();

  const db = c.get("db");
  const auth = await findUserAndWorkspaceByToken(token, db);
  if (!auth) throwUnauthorized();

  c.set("user", auth.user);
  c.set("workspace", auth.workspace);
  await next();
});
