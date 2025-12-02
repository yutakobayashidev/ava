import { randomBytes } from "crypto";
import { uuidv7 } from "uuidv7";
import * as schema from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { createHonoApp } from "@/app/create-app";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64urlNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { extractClientCredentials } from "@/lib/oauth-credentials";
import { timingSafeCompare } from "@/lib/timing-safe";
import type { Context } from "hono";
import type { Env } from "@/app/create-app";

// Token expiration times
const ACCESS_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const app = createHonoApp();

async function handleAuthorizationCodeGrant(
  c: Context<Env>,
  formData: z.infer<typeof authCodeExchangeSchema>,
) {
  const { code, redirect_uri, code_verifier } = formData;
  const db = c.get("db");

  // Extract client credentials from Authorization header or form body
  const authHeader = c.req.header("Authorization");
  const { client_id, client_secret } = extractClientCredentials(
    authHeader,
    formData.client_id,
    formData.client_secret,
  );

  if (!client_id) {
    throw new HTTPException(400, { message: "invalid_request" });
  }

  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.clientId, client_id));
  if (!client) {
    throw new HTTPException(401, { message: "invalid_client" });
  }

  // Generate tokens outside transaction to minimize transaction time
  const accessToken = randomBytes(32).toString("hex");
  const accessTokenHash = encodeHexLowerCase(
    sha256(new TextEncoder().encode(accessToken)),
  );
  const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS);

  const refreshToken = randomBytes(32).toString("hex");
  const refreshTokenHash = encodeHexLowerCase(
    sha256(new TextEncoder().encode(refreshToken)),
  );
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  // Transaction: Acquire lock, validate, consume code, and issue tokens atomically
  // This prevents race conditions from concurrent authorization code exchange requests
  await db.transaction(async (tx) => {
    // SELECT FOR UPDATE acquires a row-level lock, preventing concurrent access
    const [authCode] = await tx
      .select()
      .from(schema.authCodes)
      .where(eq(schema.authCodes.code, code))
      .for("update");

    if (
      !authCode ||
      authCode.clientId !== client.id ||
      authCode.redirectUri !== redirect_uri
    ) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    if (authCode.expiresAt < new Date()) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // Step 1: Validate PKCE if it was used
    if (authCode.codeChallenge) {
      if (!code_verifier) {
        throw new HTTPException(400, { message: "invalid_request" });
      }

      let pkceValid = false;
      if (authCode.codeChallengeMethod === "S256") {
        const codeChallengeBytes = sha256(
          new TextEncoder().encode(code_verifier),
        );
        const computedChallenge = encodeBase64urlNoPadding(codeChallengeBytes);
        // Use timing-safe comparison to prevent timing attacks
        pkceValid = timingSafeCompare(
          computedChallenge,
          authCode.codeChallenge,
        );
      } else {
        // Use timing-safe comparison for plain method as well
        pkceValid = timingSafeCompare(code_verifier, authCode.codeChallenge);
      }

      if (!pkceValid) {
        throw new HTTPException(400, { message: "invalid_grant" });
      }
    }

    // Step 2: Validate client authentication based on client type
    if (client.clientSecret) {
      // Confidential client: client_secret authentication is required
      if (!client_secret) {
        throw new HTTPException(401, { message: "invalid_client" });
      }
      // Use timing-safe comparison to prevent timing attacks
      if (!timingSafeCompare(client.clientSecret, client_secret)) {
        throw new HTTPException(401, { message: "invalid_client" });
      }
    } else {
      // Public client: PKCE is required
      if (!authCode.codeChallenge) {
        throw new HTTPException(400, { message: "invalid_request" });
      }
    }

    // Delete auth code atomically - this ensures single-use
    // If another concurrent request already deleted it, this will return 0 rows
    const deletedRows = await tx
      .delete(schema.authCodes)
      .where(eq(schema.authCodes.id, authCode.id))
      .returning();

    // Verify the delete was successful (should return 1 row)
    // If no rows were deleted, it means another request already consumed this code
    if (deletedRows.length === 0) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    if (!authCode.workspaceId) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    const [[workspace], [user]] = await Promise.all([
      tx
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, authCode.workspaceId)),
      tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, authCode.userId))
        .limit(1),
    ]);

    if (!workspace) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    if (!user || user.workspaceId !== authCode.workspaceId) {
      throw new HTTPException(403, { message: "forbidden_workspace" });
    }

    const [createdAccessToken] = await tx
      .insert(schema.accessTokens)
      .values({
        id: uuidv7(),
        tokenHash: accessTokenHash,
        expiresAt: accessTokenExpiresAt,
        clientId: client.id,
        userId: authCode.userId,
        workspaceId: authCode.workspaceId,
      })
      .returning();

    await tx.insert(schema.refreshTokens).values({
      id: uuidv7(),
      tokenHash: refreshTokenHash,
      accessTokenId: createdAccessToken.id,
      clientId: client.id,
      userId: authCode.userId,
      workspaceId: authCode.workspaceId,
      expiresAt: refreshTokenExpiresAt,
    });
  });

  return c.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
  });
}

async function handleRefreshTokenGrant(
  c: Context<Env>,
  formData: z.infer<typeof refreshTokenSchema>,
) {
  const { refresh_token } = formData;

  const db = c.get("db");

  // Extract client credentials from Authorization header or form body
  const authHeader = c.req.header("Authorization");
  const { client_id, client_secret } = extractClientCredentials(
    authHeader,
    formData.client_id,
    formData.client_secret,
  );

  // Hash the provided refresh token to compare with stored hash
  const refreshTokenHash = encodeHexLowerCase(
    sha256(new TextEncoder().encode(refresh_token)),
  );

  // Generate new tokens outside transaction to minimize transaction time
  const newAccessToken = randomBytes(32).toString("hex");
  const newAccessTokenHash = encodeHexLowerCase(
    sha256(new TextEncoder().encode(newAccessToken)),
  );
  const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS);

  const newRefreshToken = randomBytes(32).toString("hex");
  const newRefreshTokenHash = encodeHexLowerCase(
    sha256(new TextEncoder().encode(newRefreshToken)),
  );
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  // Transaction: Acquire lock, validate, and rotate tokens atomically
  // This prevents race conditions from concurrent refresh requests
  await db.transaction(async (tx) => {
    // SELECT FOR UPDATE acquires a row-level lock, preventing concurrent access
    const [storedRefreshToken] = await tx
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, refreshTokenHash))
      .for("update");

    if (!storedRefreshToken) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // Check if token has been used (rotation detection)
    // This check is now inside the transaction, after acquiring the lock
    if (storedRefreshToken.usedAt) {
      // Invalidate all tokens for this user/client (security measure)
      await tx
        .delete(schema.refreshTokens)
        .where(
          and(
            eq(schema.refreshTokens.userId, storedRefreshToken.userId),
            eq(schema.refreshTokens.clientId, storedRefreshToken.clientId),
          ),
        );
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // Check if token has expired
    if (storedRefreshToken.expiresAt < new Date()) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // Always fetch client information from the stored refresh token
    const [client] = await tx
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, storedRefreshToken.clientId));

    if (!client) {
      throw new HTTPException(401, { message: "invalid_client" });
    }

    // Client authentication based on client type
    if (client.clientSecret) {
      // Confidential client: Both client_id and client_secret are required
      if (!client_id || !client_secret) {
        throw new HTTPException(401, { message: "invalid_client" });
      }

      // Verify client_id matches the token's client
      if (client.clientId !== client_id) {
        throw new HTTPException(401, { message: "invalid_client" });
      }

      // Use timing-safe comparison to prevent timing attacks
      if (!timingSafeCompare(client.clientSecret, client_secret)) {
        throw new HTTPException(401, { message: "invalid_client" });
      }
    } else {
      // Public client: client_id is required for identification (no client_secret)
      if (!client_id) {
        throw new HTTPException(401, { message: "invalid_client" });
      }

      // Verify client_id matches the token's client
      if (client.clientId !== client_id) {
        throw new HTTPException(401, { message: "invalid_client" });
      }
    }

    // Mark the old refresh token as used with atomic UPDATE
    // The WHERE clause ensures we only update if usedAt is still NULL
    // This is a defense-in-depth measure alongside SELECT FOR UPDATE
    const updatedRows = await tx
      .update(schema.refreshTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.id, storedRefreshToken.id),
          isNull(schema.refreshTokens.usedAt),
        ),
      )
      .returning();

    // Verify the update was successful (should return 1 row)
    // If no rows were returned, it means another request already marked it as used
    if (updatedRows.length === 0) {
      // Invalidate all tokens for this user/client (security measure)
      await tx
        .delete(schema.refreshTokens)
        .where(
          and(
            eq(schema.refreshTokens.userId, storedRefreshToken.userId),
            eq(schema.refreshTokens.clientId, storedRefreshToken.clientId),
          ),
        );
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // Delete the old access token if it exists
    // Note: With onDelete: "set null", this will set accessTokenId to null in the refresh token
    // instead of deleting it, preserving the token for replay attack detection
    if (storedRefreshToken.accessTokenId) {
      await tx
        .delete(schema.accessTokens)
        .where(eq(schema.accessTokens.id, storedRefreshToken.accessTokenId));
    }

    // Create new access token
    const [newAccessTokenRecord] = await tx
      .insert(schema.accessTokens)
      .values({
        id: uuidv7(),
        tokenHash: newAccessTokenHash,
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

  return c.json({
    access_token: newAccessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: newRefreshToken,
  });
}

app.post(
  "/register",
  zValidator(
    "json",
    z.object({
      client_name: z.string().min(1),
      redirect_uris: z.array(z.url()).min(1),
    }),
  ),
  async (c) => {
    const { client_name, redirect_uris } = await c.req.valid("json");
    const clientSecret = randomBytes(32).toString("hex");
    const generatedClientId = randomBytes(16).toString("hex");
    const db = c.get("db");

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
  },
);

// Schema for OAuth2.0 authorization code exchange
const authCodeExchangeSchema = z.object({
  grant_type: z.literal("authorization_code"),
  client_id: z.string().min(1).optional(), // Optional because it can come from Authorization header
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

app.post("/token", zValidator("form", tokenGrantSchema), async (c) => {
  const formData = await c.req.valid("form");
  const { grant_type } = formData;

  if (grant_type === "authorization_code") {
    return handleAuthorizationCodeGrant(c, formData);
  } else if (grant_type === "refresh_token") {
    return handleRefreshTokenGrant(c, formData);
  }

  throw new HTTPException(400, { message: "unsupported_grant_type" });
});

export default app;
