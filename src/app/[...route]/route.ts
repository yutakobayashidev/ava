import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from "hono/cors";
import {
    StreamableHTTPTransport,
} from "@hono/mcp";
import { createMcpServer } from "../mcp";
import oauthRoutes from "./oauth"
import { oauthMiddleware } from '@/src/middleware/oauth';
import { generateState, OAuth2Tokens, Slack } from "arctic";
import { getCookie, setCookie } from 'hono/cookie';
import { db } from "@/src/clients/drizzle";
import * as schema from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { randomUUID } from "crypto";

type User = typeof schema.users.$inferSelect;

type Env = {
    Variables: {
        user: User
    }
}

const app = new Hono<Env>().use(
    cors({
        origin: (origin) => origin,
        credentials: true,
    }),
);

app.route("/", oauthRoutes)

const slackClientId = process.env.SLACK_OIDC_CLIENT_ID ?? "";
const slackClientSecret = process.env.SLACK_OIDC_CLIENT_SECRET ?? "";
const slackRedirectUri =
    process.env.SLACK_OIDC_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://localhost:3000"}/login/slack/callback`;

export const slack = new Slack(
    slackClientId,
    slackClientSecret,
    slackRedirectUri,
);

app.get("/login/slack", async (c) => {
    const state = generateState();
    const url = slack.createAuthorizationURL(state, ["openid", "profile", "email"]);

    setCookie(c, "slack_oauth_state", state, {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "lax",
    })

    return new Response(null, {
        status: 302,
        headers: {
            Location: url.toString()
        }
    });
})

type SlackUser = {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    picture: string;
};


async function getSlackUser(tokens: OAuth2Tokens): Promise<SlackUser> {
    return fetch('https://slack.com/api/openid.connect.userInfo', {
        headers: {
            Authorization: `Bearer ${tokens.accessToken()}`
        }
    }).then((response) => response.json());
}


export function generateSessionToken(): string {
    const tokenBytes = new Uint8Array(20);
    crypto.getRandomValues(tokenBytes);
    const token = encodeBase32(tokenBytes).toLowerCase();
    return token;
}

export type Session = typeof schema.sessions.$inferSelect;

export async function createSession(token: string, userId: string): Promise<Session> {
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

app.get("/login/slack/callback", async (c) => {
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
            status: 400
        });
    }
    const slackUser = await getSlackUser(tokens);

    let [existingUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.slackId, slackUser.sub));

    if (!existingUser) {
        const [newUser] = await db
            .insert(schema.users)
            .values({
                id: randomUUID(),
                slackId: slackUser.sub,
                email: slackUser.email,
                name: slackUser.name,
                image: slackUser.picture,
                emailVerified: slackUser.email_verified ? new Date() : null,
            })
            .returning();

        existingUser = newUser;
    }

    if (!existingUser) {
        return c.text("Failed to create user", 500);
    }

    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, existingUser.id);

    setCookie(c, "session", sessionToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: session.expiresAt
    })

    return new Response(null, {
        status: 302,
        headers: {
            Location: "/"
        }
    });

})

app.all(
    "/mcp",
    oauthMiddleware,
    async (c) => {
        const user = c.get('user');
        const mcp = createMcpServer(user);
        const transport = new StreamableHTTPTransport();

        await mcp.connect(transport);

        return transport.handleRequest(c);
    },
);
export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
