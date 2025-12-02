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
  console.log("Received token request");

  const formData = await c.req.valid("form");
  const { grant_type } = formData;

  console.log("Form data:", { grant_type });

  if (grant_type === "authorization_code") {
    // Authorization code exchange flow
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
      console.log("Missing client_id");
      throw new HTTPException(400, { message: "invalid_request" });
    }

    console.log("Finding client for client_id:", client_id);
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.clientId, client_id));
    if (!client) {
      console.log("Invalid client.", { client_id });
      throw new HTTPException(401, { message: "invalid_client" });
    }

    // Generate tokens outside transaction to minimize transaction time
    const accessToken = randomBytes(32).toString("hex");
    const accessTokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(accessToken)),
    );
    const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(refreshToken)),
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ); // 30 days

    // Transaction: Acquire lock, validate, consume code, and issue tokens atomically
    // This prevents race conditions from concurrent authorization code exchange requests
    const result = await db.transaction(async (tx) => {
      // SELECT FOR UPDATE acquires a row-level lock, preventing concurrent access
      console.log("Finding and locking auth code:", code);
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
        console.log("Invalid code or redirect_uri mismatch.", {
          authCode,
          client_id: client.id,
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

      // Step 1: Validate PKCE if it was used
      if (authCode.codeChallenge) {
        if (!code_verifier) {
          console.log("PKCE code_verifier missing");
          throw new HTTPException(400, { message: "invalid_request" });
        }

        let pkceValid = false;
        if (authCode.codeChallengeMethod === "S256") {
          const codeChallengeBytes = sha256(
            new TextEncoder().encode(code_verifier),
          );
          const computedChallenge =
            encodeBase64urlNoPadding(codeChallengeBytes);
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
          console.log("PKCE validation failed");
          throw new HTTPException(400, { message: "invalid_grant" });
        }
        console.log("PKCE validation successful");
      }

      // Step 2: Validate client authentication based on client type
      if (client.clientSecret) {
        // Confidential client: client_secret authentication is required
        if (!client_secret) {
          console.log("Missing client_secret for confidential client", {
            client_id,
          });
          throw new HTTPException(401, { message: "invalid_client" });
        }
        // Use timing-safe comparison to prevent timing attacks
        if (!timingSafeCompare(client.clientSecret, client_secret)) {
          console.log("Invalid client_secret", { client_id });
          throw new HTTPException(401, { message: "invalid_client" });
        }
        console.log("Client secret validation successful");
      } else {
        // Public client: PKCE is required
        if (!authCode.codeChallenge) {
          console.log("PKCE required for public client but not provided", {
            client_id,
          });
          throw new HTTPException(400, { message: "invalid_request" });
        }
        console.log("Public client validated with PKCE");
      }

      // Delete auth code atomically - this ensures single-use
      // If another concurrent request already deleted it, this will return 0 rows
      console.log("Consuming auth code:", authCode.id);
      const deletedRows = await tx
        .delete(schema.authCodes)
        .where(eq(schema.authCodes.id, authCode.id))
        .returning();

      // Verify the delete was successful (should return 1 row)
      // If no rows were deleted, it means another request already consumed this code
      if (deletedRows.length === 0) {
        console.log(
          "Auth code was already used by concurrent request - race condition detected",
          {
            codeId: authCode.id,
          },
        );
        throw new HTTPException(400, { message: "invalid_grant" });
      }
      console.log("Auth code consumed successfully.");

      if (!authCode.workspaceId) {
        console.log("Auth code missing workspace_id", {
          authCodeId: authCode.id,
        });
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

      console.log("Creating access token for user:", authCode.userId);
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
      console.log("Access token created.");

      console.log("Creating refresh token for user:", authCode.userId);
      await tx.insert(schema.refreshTokens).values({
        id: uuidv7(),
        tokenHash: refreshTokenHash,
        accessTokenId: createdAccessToken.id,
        clientId: client.id,
        userId: authCode.userId,
        workspaceId: authCode.workspaceId,
        expiresAt: refreshTokenExpiresAt,
      });
      console.log("Refresh token created.");

      return { userId: authCode.userId };
    });

    console.log(
      "Authorization code exchanged successfully for user:",
      result.userId,
    );

    return c.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
    });
  } else if (grant_type === "refresh_token") {
    // Refresh token flow
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
    const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const newRefreshToken = randomBytes(32).toString("hex");
    const newRefreshTokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(newRefreshToken)),
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ); // 30 days

    // Transaction: Acquire lock, validate, and rotate tokens atomically
    // This prevents race conditions from concurrent refresh requests
    const result = await db.transaction(async (tx) => {
      // SELECT FOR UPDATE acquires a row-level lock, preventing concurrent access
      const [storedRefreshToken] = await tx
        .select()
        .from(schema.refreshTokens)
        .where(eq(schema.refreshTokens.tokenHash, refreshTokenHash))
        .for("update");

      if (!storedRefreshToken) {
        console.log("Invalid refresh token");
        throw new HTTPException(400, { message: "invalid_grant" });
      }

      // Check if token has been used (rotation detection)
      // This check is now inside the transaction, after acquiring the lock
      if (storedRefreshToken.usedAt) {
        console.log("Refresh token already used - potential replay attack", {
          tokenId: storedRefreshToken.id,
        });
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
        console.log("Refresh token expired");
        throw new HTTPException(400, { message: "invalid_grant" });
      }

      // Always fetch client information from the stored refresh token
      const [client] = await tx
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, storedRefreshToken.clientId));

      if (!client) {
        console.log("Client not found for refresh token", {
          clientId: storedRefreshToken.clientId,
        });
        throw new HTTPException(401, { message: "invalid_client" });
      }

      // Client authentication based on client type
      if (client.clientSecret) {
        // Confidential client: Both client_id and client_secret are required
        if (!client_id || !client_secret) {
          console.log("Missing credentials for confidential client", {
            has_client_id: !!client_id,
            has_client_secret: !!client_secret,
          });
          throw new HTTPException(401, { message: "invalid_client" });
        }

        // Verify client_id matches the token's client
        if (client.clientId !== client_id) {
          console.log("Client ID mismatch for confidential client", {
            provided: client_id,
            expected: client.clientId,
          });
          throw new HTTPException(401, { message: "invalid_client" });
        }

        // Use timing-safe comparison to prevent timing attacks
        if (!timingSafeCompare(client.clientSecret, client_secret)) {
          console.log("Invalid client_secret");
          throw new HTTPException(401, { message: "invalid_client" });
        }
        console.log("Confidential client authentication successful");
      } else {
        // Public client: client_id is required for identification (no client_secret)
        if (!client_id) {
          console.log("Missing client_id for public client");
          throw new HTTPException(401, { message: "invalid_client" });
        }

        // Verify client_id matches the token's client
        if (client.clientId !== client_id) {
          console.log("Client ID mismatch for public client", {
            provided: client_id,
            expected: client.clientId,
          });
          throw new HTTPException(401, { message: "invalid_client" });
        }
        console.log("Public client validated");
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
        console.log(
          "Refresh token was already used by concurrent request - race condition detected",
          {
            tokenId: storedRefreshToken.id,
          },
        );
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

      return { userId: storedRefreshToken.userId };
    });

    console.log("Refresh token rotated successfully for user:", result.userId);

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
