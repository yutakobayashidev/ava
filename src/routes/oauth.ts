import { createHash, randomBytes } from 'crypto';
import { uuidv7 } from 'uuidv7';
import * as schema from "../db/schema";
import { and, eq } from "drizzle-orm";
import { createHonoApp } from '@/app/factory';
import { absoluteUrl } from "@/lib/utils";
import { zValidator } from '@hono/zod-validator'
import { z } from "zod"

const app = createHonoApp()

app.post("/api/oauth/register", zValidator(
  "json",
  z.object({
    client_name: z.string().min(1),
    redirect_uris: z.array(z.url()).min(1),
  })
), async (c) => {

  const { client_name, redirect_uris } = await c.req.valid("json")
  const clientSecret = randomBytes(32).toString('hex');
  const generatedClientId = randomBytes(16).toString('hex');

  try {
    const db = c.get('db');
    const [newClient] = await db
      .insert(schema.clients)
      .values({
        id: uuidv7(),
        clientId: generatedClientId,
        clientSecret,
        name: client_name,
        redirectUris: redirect_uris,
      })
      .returning();

    return c.json({
      client_id: newClient.clientId,
      client_secret: clientSecret,
      redirect_uris,
    });
  } catch (e) {
    console.error(e);
    return c.json(
      { error: 'Error creating client' },
      500,
    );
  }

})

// Schema for OAuth2.0 authorization code exchange
const authCodeExchangeSchema = z.object({
  grant_type: z.literal("authorization_code"),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
  code: z.string().min(1, "Missing code"),
  redirect_uri: z.url({ message: "redirect_uri must be a valid URL" }),
  code_verifier: z.string().max(190).optional(),
});

// Schema for OAuth2.0 token refresh request
const refreshTokenSchema = z.object({
  grant_type: z.literal("refresh_token"),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  refresh_token: z.string().min(1, "Missing refresh_token"),
});

// Token grant schema
const tokenGrantSchema = z.discriminatedUnion(
  "grant_type",
  [authCodeExchangeSchema, refreshTokenSchema],
  {
    error: () => ({
      message: "grant_type must be 'authorization_code' or 'refresh_token'",
    }),
  },
);

app.post("/api/oauth/token", zValidator("form", tokenGrantSchema), async (c) => {
  console.log("Received token request");

  const formData = await c.req.valid("form");
  const { grant_type } = formData;

  console.log("Form data:", { grant_type });

  if (grant_type === "authorization_code") {
    // Authorization code exchange flow
    const { code, redirect_uri, client_id, client_secret, code_verifier } = formData;

    try {

      console.log("Finding client for client_id:", client_id);
      const db = c.get('db');
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.clientId, client_id));
      if (!client) {
        console.log("Invalid client.", { client_id });
        return c.json({ error: 'invalid_client' }, 401);
      }

      console.log("Finding auth code:", code);
      const [authCode] = await db
        .select()
        .from(schema.authCodes)
        .where(eq(schema.authCodes.code, code));

      if (
        !authCode ||
        authCode.clientId !== client.id ||
        authCode.redirectUri !== redirect_uri
      ) {
        console.log("Invalid code or redirect_uri mismatch.", { authCode, client_id: client.id, redirect_uri });
        return c.json({ error: 'invalid_grant' }, 400);
      }
      console.log("Found auth code for user:", authCode.userId);

      if (authCode.expiresAt < new Date()) {
        console.log("Auth code expired at:", authCode.expiresAt);
        return c.json({ error: 'invalid_grant' }, 400);
      }
      console.log("Auth code is valid.");

      // PKCE or client_secret validation
      if (authCode.codeChallenge) {
        if (!code_verifier) {
          return c.json({ error: 'invalid_request' }, 400);
        }

        let pkceValid = false;
        if (authCode.codeChallengeMethod === 'S256') {
          const hash = createHash('sha256').update(code_verifier).digest();
          const base64url = hash
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
          pkceValid = base64url === authCode.codeChallenge;
        } else {
          pkceValid = code_verifier === authCode.codeChallenge;
        }

        if (!pkceValid) {
          return c.json({ error: 'invalid_grant' }, 400);
        }
      } else {
        // No PKCE - client_secret is required
        if (!client_secret || !client.clientSecret || client.clientSecret !== client_secret) {
          console.log("Invalid client_secret.", { client_id });
          return c.json({ error: 'invalid_client' }, 401);
        }
      }

      // Delete auth code immediately after validation
      console.log("Deleting auth code:", authCode.id);
      await db.delete(schema.authCodes).where(eq(schema.authCodes.id, authCode.id));
      console.log("Auth code deleted.");

      if (!authCode.workspaceId) {
        console.log("Auth code missing workspace_id", { authCodeId: authCode.id });
        return c.json({ error: "invalid_grant" }, 400);
      }

      const [[workspace], [membership]] = await Promise.all([
        db
          .select()
          .from(schema.workspaces)
          .where(eq(schema.workspaces.id, authCode.workspaceId)),
        db
          .select()
          .from(schema.workspaceMembers)
          .where(
            and(
              eq(schema.workspaceMembers.workspaceId, authCode.workspaceId),
              eq(schema.workspaceMembers.userId, authCode.userId),
            ),
          )
          .limit(1),
      ]);

      if (!workspace) {
        console.log("Workspace not found for auth code", { workspaceId: authCode.workspaceId });
        return c.json({ error: "invalid_grant" }, 400);
      }

      if (!membership) {
        console.log("User not a member of workspace", { workspaceId: authCode.workspaceId, userId: authCode.userId });
        return c.json({ error: "forbidden_workspace" }, 403);
      }

      const accessToken = randomBytes(32).toString('hex');
      const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      console.log("Creating access token for user:", authCode.userId);
      const [createdAccessToken] = await db.insert(schema.accessTokens).values({
        id: uuidv7(),
        token: accessToken,
        expiresAt: accessTokenExpiresAt,
        clientId: client.id,
        userId: authCode.userId,
        workspaceId: authCode.workspaceId,
      }).returning();
      console.log("Access token created.");

      // Generate refresh token
      const refreshToken = randomBytes(32).toString('hex');
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      console.log("Creating refresh token for user:", authCode.userId);
      await db.insert(schema.refreshTokens).values({
        id: uuidv7(),
        tokenHash: refreshTokenHash,
        accessTokenId: createdAccessToken.id,
        clientId: client.id,
        userId: authCode.userId,
        workspaceId: authCode.workspaceId,
        expiresAt: refreshTokenExpiresAt,
      });
      console.log("Refresh token created.");

      return c.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refreshToken,
      });
    } catch (e) {
      console.error("Error in token endpoint:", e);
      return c.json({ error: 'server_error' }, 500);
    }
  } else if (grant_type === "refresh_token") {
    // Refresh token flow
    const { refresh_token, client_id, client_secret } = formData;

    try {
      const db = c.get('db');

      // Hash the provided refresh token to compare with stored hash
      const refreshTokenHash = createHash('sha256').update(refresh_token).digest('hex');

      // Find the refresh token
      const [storedRefreshToken] = await db
        .select()
        .from(schema.refreshTokens)
        .where(eq(schema.refreshTokens.tokenHash, refreshTokenHash));

      if (!storedRefreshToken) {
        console.log("Invalid refresh token");
        return c.json({ error: 'invalid_grant' }, 400);
      }

      // Check if token has been used (rotation detection)
      if (storedRefreshToken.usedAt) {
        console.log("Refresh token already used - potential replay attack", { tokenId: storedRefreshToken.id });
        // Invalidate all tokens for this user/client (security measure)
        await db.delete(schema.refreshTokens).where(
          and(
            eq(schema.refreshTokens.userId, storedRefreshToken.userId),
            eq(schema.refreshTokens.clientId, storedRefreshToken.clientId)
          )
        );
        return c.json({ error: 'invalid_grant' }, 400);
      }

      // Check if token has expired
      if (storedRefreshToken.expiresAt < new Date()) {
        console.log("Refresh token expired");
        return c.json({ error: 'invalid_grant' }, 400);
      }

      // Verify client if client_id is provided
      if (client_id) {
        const [client] = await db
          .select()
          .from(schema.clients)
          .where(eq(schema.clients.clientId, client_id));

        if (!client || client.id !== storedRefreshToken.clientId) {
          console.log("Client mismatch");
          return c.json({ error: 'invalid_client' }, 401);
        }

        // Verify client_secret if provided and client has one
        if (client.clientSecret && (!client_secret || client.clientSecret !== client_secret)) {
          console.log("Invalid client_secret");
          return c.json({ error: 'invalid_client' }, 401);
        }
      }

      // Generate new tokens
      const newAccessToken = randomBytes(32).toString('hex');
      const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const newRefreshToken = randomBytes(32).toString('hex');
      const newRefreshTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
      const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Transaction: Delete old access token, mark old refresh token as used, create new tokens
      await db.transaction(async (tx) => {
        // Delete the old access token
        await tx
          .delete(schema.accessTokens)
          .where(eq(schema.accessTokens.id, storedRefreshToken.accessTokenId));

        // Mark the old refresh token as used
        await tx
          .update(schema.refreshTokens)
          .set({ usedAt: new Date() })
          .where(eq(schema.refreshTokens.id, storedRefreshToken.id));

        // Create new access token
        const [newAccessTokenRecord] = await tx
          .insert(schema.accessTokens)
          .values({
            id: uuidv7(),
            token: newAccessToken,
            expiresAt: accessTokenExpiresAt,
            clientId: storedRefreshToken.clientId,
            userId: storedRefreshToken.userId,
            workspaceId: storedRefreshToken.workspaceId,
          })
          .returning();

        // Create new refresh token
        await tx.insert(schema.refreshTokens).values({
          id: uuidv7(),
          tokenHash: newRefreshTokenHash,
          accessTokenId: newAccessTokenRecord.id,
          clientId: storedRefreshToken.clientId,
          userId: storedRefreshToken.userId,
          workspaceId: storedRefreshToken.workspaceId,
          expiresAt: refreshTokenExpiresAt,
        });

      });

      console.log("Refresh token rotated successfully for user:", storedRefreshToken.userId);

      return c.json({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: newRefreshToken,
      });
    } catch (e) {
      console.error("Error in refresh token flow:", e);
      return c.json({ error: 'server_error' }, 500);
    }
  }

  return c.json({ error: 'unsupported_grant_type' }, 400);
});

app.get("/.well-known/oauth-authorization-server", (c) => {

  const metadata = {
    issuer: absoluteUrl(""),
    authorization_endpoint: absoluteUrl("/oauth/authorize"),
    token_endpoint: absoluteUrl("/api/oauth/token"),
    registration_endpoint: absoluteUrl("/api/oauth/register"),
    scopes_supported: ["api:read", "api:write"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    code_challenge_methods_supported: ["plain", "S256"],
  };

  return c.json(metadata);
});

app.get("/.well-known/oauth-protected-resource", (c) => {

  const metadata = {
    resource: absoluteUrl("/mcp"),
    authorization_servers: [absoluteUrl("")],
    scopes_supported: ["api:read", "api:write"],
    bearer_methods_supported: ["header"],
    resource_documentation: absoluteUrl("/docs"),
  };

  return c.json(metadata);
});

export default app
