import { createMiddleware } from 'hono/factory';
import { eq } from "drizzle-orm";
import { db } from '../clients/drizzle';
import * as schema from "../db/schema";
import { Context, Env } from 'hono';

const unauthorized = () => new Response("Unauthorized", { status: 401 });

async function findUserByToken(token: string) {
  const [accessToken] = await db
    .select()
    .from(schema.accessTokens)
    .where(eq(schema.accessTokens.token, token));

  if (!accessToken) return null;
  if (accessToken.expiresAt.getTime() < Date.now()) return null;

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, accessToken.userId));

  return user ?? null;
}

function getToken(c: Context<Env>) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}

export const oauthMiddleware = createMiddleware(async (c, next) => {
  const token = getToken(c);
  if (!token) return unauthorized();

  const user = await findUserByToken(token);
  if (!user) return unauthorized();

  c.set("user", user);
  return next();
});
