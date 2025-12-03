import type { Env } from "@/app/create-app";
import { createHonoApp } from "@/app/create-app";
import * as schema from "@/db/schema";
import { timingSafeCompare } from "@/lib/timing-safe";
import { zValidator } from "@hono/zod-validator";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64urlNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

// Token expiration times
const ACCESS_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const app = createHonoApp();

/**
 * OAuthエンドポイント共通の認証およびリクエスト解析処理
 * クライアント認証とフォームパースを行う
 */
async function parseAndAuthenticateRequest(
  db: Context<Env>["var"]["db"],
  authHeader: string | undefined,
  contentType: string,
  formData: Record<string, string | File>,
) {
  // OAuth 2.0 RFC 6749/7009 に従い、リクエストは application/x-www-form-urlencodedである必要がある
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    throw new HTTPException(400, { message: "invalid_request" });
  }

  // Extract client credentials from Authorization header or form body
  let clientId = "";
  let clientSecret = "";

  if (authHeader && authHeader.startsWith("Basic ")) {
    // Basic auth
    const credentials = atob(authHeader.substring(6));
    const [id, secret] = credentials.split(":", 2);
    clientId = decodeURIComponent(id);
    clientSecret = decodeURIComponent(secret || "");
  } else {
    // Form parameters
    clientId = typeof formData.client_id === "string" ? formData.client_id : "";
    clientSecret =
      typeof formData.client_secret === "string" ? formData.client_secret : "";
  }

  if (!clientId) {
    throw new HTTPException(401, {
      message: "invalid_client: Client ID is required",
    });
  }

  // Fetch client from database
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.clientId, clientId));

  if (!client) {
    throw new HTTPException(401, {
      message: "invalid_client: Client not found",
    });
  }

  const isPublicClient = client.tokenEndpointAuthMethod === "none";

  // For confidential clients, validate the secret
  if (!isPublicClient) {
    if (!clientSecret) {
      throw new HTTPException(401, {
        message:
          "invalid_client: Client authentication failed - missing client_secret",
      });
    }

    // Hash the provided client_secret and use timing-safe comparison
    const clientSecretHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(clientSecret)),
    );

    if (
      !client.clientSecret ||
      !timingSafeCompare(client.clientSecret, clientSecretHash)
    ) {
      throw new HTTPException(401, {
        message:
          "invalid_client: Client authentication failed - invalid client_secret",
      });
    }
  }

  return {
    client,
    isPublicClient,
    formData,
  };
}

async function handleAuthorizationCodeGrant(
  body: z.infer<typeof authCodeExchangeSchema>,
  client: typeof schema.clients.$inferSelect,
  c: Context<Env>,
) {
  const code = body.code;
  const redirectUri = body.redirect_uri;
  const codeVerifier = body.code_verifier;

  const db = c.get("db");

  // トランザクション時間を最小化するため、トークン生成は先に行う
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

  // トランザクション: ロックを取得し、バリデーション・認可コードの消費・トークン発行をアトミックに実行する
  // これにより、同時に認可コード交換リクエストが発生した際の競合・レースコンディションを防ぐ
  await db.transaction(async (tx) => {
    const [authCode] = await tx
      .select()
      .from(schema.authCodes)
      .where(eq(schema.authCodes.code, code))
      .for("update");

    if (!authCode) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    if (authCode.clientId !== client.id) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    if (authCode.expiresAt < new Date()) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // PKCE が使用されているかどうかを確認
    const isPkceEnabled = !!authCode.codeChallenge;

    if (!redirectUri && !isPkceEnabled) {
      throw new HTTPException(400, { message: "invalid_request" });
    }

    if (redirectUri && !client.redirectUris.includes(redirectUri)) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // 認可時にPKCEが使われなかった場合、code_verifierが送られてきたら拒否する
    if (!isPkceEnabled && codeVerifier) {
      throw new HTTPException(400, { message: "invalid_request" });
    }

    // ステップ1: PKCE が利用された場合は検証を行う
    if (isPkceEnabled) {
      if (!codeVerifier || !authCode.codeChallenge) {
        throw new HTTPException(400, { message: "invalid_request" });
      }

      let calculatedChallenge: string;
      if (authCode.codeChallengeMethod === "S256") {
        const codeChallengeBytes = sha256(
          new TextEncoder().encode(codeVerifier),
        );
        calculatedChallenge = encodeBase64urlNoPadding(codeChallengeBytes);
      } else {
        calculatedChallenge = codeVerifier;
      }

      if (calculatedChallenge !== authCode.codeChallenge) {
        throw new HTTPException(400, { message: "invalid_grant" });
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
  body: z.infer<typeof refreshTokenSchema>,
  client: typeof schema.clients.$inferSelect,
  c: Context<Env>,
) {
  const refreshToken = body.refresh_token;
  const db = c.get("db");

  // Hash the provided refresh token to compare with stored hash
  const refreshTokenHash = encodeHexLowerCase(
    sha256(new TextEncoder().encode(refreshToken)),
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

    // Verify the client matches the refresh token's client
    if (storedRefreshToken.clientId !== client.id) {
      throw new HTTPException(401, {
        message: "invalid_client: Client mismatch",
      });
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
      token_endpoint_auth_method: z
        .enum(["client_secret_basic", "client_secret_post", "none"])
        .optional()
        .default("client_secret_basic"),
    }),
  ),
  async (c) => {
    const { client_name, redirect_uris, token_endpoint_auth_method } =
      c.req.valid("json");

    // Determine if this is a public client
    const isPublicClient = token_endpoint_auth_method === "none";

    // Generate client secret only for confidential clients
    let clientSecret: string | undefined;
    let clientSecretHash: string | null = null;

    if (!isPublicClient) {
      clientSecret = randomBytes(32).toString("hex");
      clientSecretHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(clientSecret)),
      );
    }

    const generatedClientId = randomBytes(16).toString("hex");
    const db = c.get("db");

    const [newClient] = await db
      .insert(schema.clients)
      .values({
        id: uuidv7(),
        clientId: generatedClientId,
        clientSecret: clientSecretHash,
        name: client_name,
        redirectUris: redirect_uris,
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        tokenEndpointAuthMethod: token_endpoint_auth_method,
      })
      .returning();

    // Return response based on client type
    const response: {
      client_id: string;
      client_secret?: string;
      redirect_uris: string[];
    } = {
      client_id: newClient.clientId,
      redirect_uris,
    };

    // Only include client_secret for confidential clients
    if (clientSecret) {
      response.client_secret = clientSecret;
    }

    return c.json(response);
  },
);

// Schema for OAuth2.0 authorization code exchange
const authCodeExchangeSchema = z.object({
  grant_type: z.literal("authorization_code"),
  client_id: z.string().min(1).optional(),
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

app.post("/token", zValidator("form", tokenGrantSchema), async (ctx) => {
  const body = ctx.req.valid("form");
  const db = ctx.get("db");
  const authHeader = ctx.req.header("Authorization");
  const contentType = ctx.req.header("Content-Type") || "";

  const { client } = await parseAndAuthenticateRequest(
    db,
    authHeader,
    contentType,
    body,
  );

  if (body.grant_type === "authorization_code") {
    return handleAuthorizationCodeGrant(body, client, ctx);
  } else if (body.grant_type === "refresh_token") {
    return handleRefreshTokenGrant(body, client, ctx);
  }

  throw new HTTPException(400, { message: "unsupported_grant_type" });
});

export default app;
