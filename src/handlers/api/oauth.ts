import { randomBytes } from "crypto";
import { uuidv7 } from "uuidv7";
import * as schema from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createHonoApp } from "@/app/create-app";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64urlNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { isCimdClientId, fetchCimdDocumentWithCache } from "@/lib/server/cimd";

const app = createHonoApp();

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

app.post("/token", zValidator("form", tokenGrantSchema), async (c) => {
  console.log("Received token request");

  const formData = await c.req.valid("form");
  const { grant_type } = formData;

  console.log("Form data:", { grant_type });

  if (grant_type === "authorization_code") {
    // Authorization code exchange flow
    const { code, redirect_uri, client_id, client_secret, code_verifier } =
      formData;
    const db = c.get("db");

    console.log("Finding client for client_id:", client_id);

    // Check if client_id is a CIMD URL
    let clientIdForStorage: string;
    let requiresClientSecret = false;

    if (isCimdClientId(client_id)) {
      console.log("CIMD client detected:", client_id);

      // CIMD クライアントの検証
      const cimdResult = await fetchCimdDocumentWithCache(client_id);
      if (!cimdResult.success) {
        console.log("Invalid CIMD client:", cimdResult.errorDescription);
        throw new HTTPException(401, { message: "invalid_client" });
      }

      clientIdForStorage = client_id;
      // CIMD では共有シークレットは使わない（PKCE のみ）
      requiresClientSecret = false;
    } else {
      // 従来の登録済みクライアント
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.clientId, client_id));

      if (!client) {
        console.log("Invalid client.", { client_id });
        throw new HTTPException(401, { message: "invalid_client" });
      }

      clientIdForStorage = client.id;
      requiresClientSecret = !!client.clientSecret; // clientSecret がある場合は検証が必要
    }

    console.log("Finding auth code:", code);
    const [authCode] = await db
      .select()
      .from(schema.authCodes)
      .where(eq(schema.authCodes.code, code));

    if (
      !authCode ||
      authCode.clientId !== clientIdForStorage ||
      authCode.redirectUri !== redirect_uri
    ) {
      console.log("Invalid code or redirect_uri mismatch.", {
        authCode,
        clientIdForStorage,
        redirect_uri,
      });
      throw new HTTPException(400, { message: "invalid_grant" });
    }
    console.log("Found auth code for user:", authCode.userId);

    if (authCode.expiresAt < new Date()) {
      console.log("Auth code expired at:", authCode.expiresAt);
      throw new HTTPException(400, { message: "invalid_grant" });
    }
    console.log("Auth code is valid.");

    // PKCE or client_secret validation
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
        pkceValid = computedChallenge === authCode.codeChallenge;
      } else {
        pkceValid = code_verifier === authCode.codeChallenge;
      }

      if (!pkceValid) {
        throw new HTTPException(400, { message: "invalid_grant" });
      }
    } else if (requiresClientSecret) {
      // No PKCE - client_secret is required (only for non-CIMD clients)
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, clientIdForStorage));

      if (
        !client_secret ||
        !client?.clientSecret ||
        client.clientSecret !== client_secret
      ) {
        console.log("Invalid client_secret.", { client_id });
        throw new HTTPException(401, { message: "invalid_client" });
      }
    }

    // Delete auth code immediately after validation
    console.log("Deleting auth code:", authCode.id);
    await db
      .delete(schema.authCodes)
      .where(eq(schema.authCodes.id, authCode.id));
    console.log("Auth code deleted.");

    if (!authCode.workspaceId) {
      console.log("Auth code missing workspace_id", {
        authCodeId: authCode.id,
      });
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    const [[workspace], [user]] = await Promise.all([
      db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, authCode.workspaceId)),
      db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, authCode.userId))
        .limit(1),
    ]);

    if (!workspace) {
      console.log("Workspace not found for auth code", {
        workspaceId: authCode.workspaceId,
      });
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    if (!user || user.workspaceId !== authCode.workspaceId) {
      console.log("User not associated with workspace", {
        workspaceId: authCode.workspaceId,
        userId: authCode.userId,
        userWorkspaceId: user?.workspaceId,
      });
      throw new HTTPException(403, { message: "forbidden_workspace" });
    }

    const accessToken = randomBytes(32).toString("hex");
    const accessTokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(accessToken)),
    );
    const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    console.log("Creating access token for user:", authCode.userId);
    const [createdAccessToken] = await db
      .insert(schema.accessTokens)
      .values({
        id: uuidv7(),
        tokenHash: accessTokenHash,
        expiresAt: accessTokenExpiresAt,
        clientId: clientIdForStorage,
        userId: authCode.userId,
        workspaceId: authCode.workspaceId,
      })
      .returning();
    console.log("Access token created.");

    // Generate refresh token
    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(refreshToken)),
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ); // 30 days

    console.log("Creating refresh token for user:", authCode.userId);
    await db.insert(schema.refreshTokens).values({
      id: uuidv7(),
      tokenHash: refreshTokenHash,
      accessTokenId: createdAccessToken.id,
      clientId: clientIdForStorage,
      userId: authCode.userId,
      workspaceId: authCode.workspaceId,
      expiresAt: refreshTokenExpiresAt,
    });
    console.log("Refresh token created.");

    return c.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
    });
  } else if (grant_type === "refresh_token") {
    // Refresh token flow
    const { refresh_token, client_id, client_secret } = formData;

    const db = c.get("db");

    // Hash the provided refresh token to compare with stored hash
    const refreshTokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(refresh_token)),
    );

    // Find the refresh token
    const [storedRefreshToken] = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, refreshTokenHash));

    if (!storedRefreshToken) {
      console.log("Invalid refresh token");
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // Check if token has been used (rotation detection)
    if (storedRefreshToken.usedAt) {
      console.log("Refresh token already used - potential replay attack", {
        tokenId: storedRefreshToken.id,
      });
      // Invalidate all tokens for this user/client (security measure)
      await db
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
      console.log("Refresh token expired");
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // Verify client if client_id is provided
    if (client_id) {
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.clientId, client_id));

      if (!client || client.id !== storedRefreshToken.clientId) {
        console.log("Client mismatch");
        throw new HTTPException(401, { message: "invalid_client" });
      }

      // Verify client_secret if provided and client has one
      if (
        client.clientSecret &&
        (!client_secret || client.clientSecret !== client_secret)
      ) {
        console.log("Invalid client_secret");
        throw new HTTPException(401, { message: "invalid_client" });
      }
    }

    // Generate new tokens
    const newAccessToken = randomBytes(32).toString("hex");
    const newAccessTokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(newAccessToken)),
    );
    const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const newRefreshToken = randomBytes(32).toString("hex");
    const newRefreshTokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(newRefreshToken)),
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ); // 30 days

    // Transaction: Mark old refresh token as used, delete old access token, create new tokens
    await db.transaction(async (tx) => {
      // Mark the old refresh token as used FIRST (for replay attack detection)
      await tx
        .update(schema.refreshTokens)
        .set({ usedAt: new Date() })
        .where(eq(schema.refreshTokens.id, storedRefreshToken.id));

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

    console.log(
      "Refresh token rotated successfully for user:",
      storedRefreshToken.userId,
    );

    return c.json({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: newRefreshToken,
    });
  }

  throw new HTTPException(400, { message: "unsupported_grant_type" });
});

export default app;
