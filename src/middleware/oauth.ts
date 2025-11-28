import { createMiddleware } from 'hono/factory';
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { db } from '../clients/drizzle';

const unauthorizedResponse = () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });


const parseBearerToken = (auth: string | undefined) => {
    if (!auth) return null;

    const [scheme, token] = auth.split(" ");
    if (scheme !== "Bearer" || !token) return null;

    return token;
};

export const oauthMiddleware = createMiddleware(async (c, next) => {
    const header = c.req.header("Authorization");
    const token = parseBearerToken(header);

    if (!token) return unauthorizedResponse();

    const [accessToken] = await db
        .select()
        .from(schema.accessTokens)
        .where(eq(schema.accessTokens.token, token));

    if (!accessToken) return unauthorizedResponse();

    if (accessToken.expiresAt.getTime() < Date.now()) {
        return unauthorizedResponse();
    }

    const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, accessToken.userId));

    if (!user) return unauthorizedResponse();

    c.set('user', user);
    c.set('accessToken', accessToken);

    await next();
});
