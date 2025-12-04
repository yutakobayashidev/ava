import type { Env } from "@/app/create-app";
import { createHonoApp } from "@/app/create-app";
import type { Database } from "@/clients/drizzle";
import * as schema from "@/db/schema";
import { timingSafeCompare } from "@/lib/timing-safe";
import { zValidator } from "@hono/zod-validator";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64urlNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

// Token expiration times
const ACCESS_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Maximum size for CIMD metadata documents (5KB per IETF spec recommendation)
 */
const CIMD_MAX_SIZE_BYTES = 5 * 1024;

/**
 * Default cache TTL for CIMD metadata (1 hour in seconds)
 */
const CIMD_DEFAULT_CACHE_TTL = 3600;

/**
 * Maximum cache TTL for CIMD metadata (24 hours in seconds, per spec recommendation)
 */
const CIMD_MAX_CACHE_TTL = 24 * 60 * 60;

/**
 * Request timeout for CIMD metadata fetches (10 seconds)
 * Prevents slow-loris style attacks
 */
const CIMD_FETCH_TIMEOUT_MS = 10_000;

/**
 * Prohibited authentication methods for CIMD clients (per IETF spec)
 * CIMD clients cannot use symmetric secrets since there's no pre-shared secret
 */
const CIMD_PROHIBITED_AUTH_METHODS = [
  "client_secret_post",
  "client_secret_basic",
] as const;

const app = createHonoApp();

/**
 * Client Identity Metadata Document から取得するクライアント情報
 */
export type ClientInfo = {
  clientId: string;
  clientName?: string;
  clientUri?: string;
  logoUri?: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  tokenEndpointAuthMethod: string;
  contacts?: string[];
  policyUri?: string;
  tosUri?: string;
  jwksUri?: string;
};

/**
 * クライアントIDが有効なCIMD URL（Client Identity Metadata Document URL）かどうかをチェックする
 * HTTPSプロトコルで、パスがルート以外である必要がある
 */
export function isClientMetadataUrl(clientId: string): boolean {
  try {
    const url = new URL(clientId);
    return url.protocol === "https:" && url.pathname !== "/";
  } catch {
    return false;
  }
}

/**
 * データベースからクライアントIDでクライアントを取得する
 */
export async function getClientFromDB(db: Database, clientId: string) {
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.clientId, clientId));

  return client;
}

/**
 * クライアントIDからクライアント情報を取得する
 * CIMD URL の場合はメタデータドキュメントを取得し、
 * そうでない場合はKVから取得する
 */
export async function getClient(
  env: any,
  clientId: string,
): Promise<ClientInfo | null> {
  // Check if this is a CIMD (Client ID Metadata Document) URL
  if (isClientMetadataUrl(clientId)) {
    return fetchClientMetadataDocument(env, clientId);
  }

  // Standard KV lookup
  const clientKey = `client:${clientId}`;
  return env.OAUTH_KV.get(clientKey, { type: "json" });
}

/**
 * Cache-Controlヘッダからmax-age値を抽出してTTLを返す関数。
 * 許可された範囲内でTTL（秒）を返す。
 *
 * @param cacheControl - Cache-Controlヘッダの値
 * @param defaultTtl - max-ageが見つからない場合のデフォルトTTL
 * @param maxTtl - 許容される最大TTL
 * @returns TTL（秒単位）
 */
export function parseCacheControlMaxAge(
  cacheControl: string | null,
  defaultTtl: number,
  maxTtl: number,
): number {
  if (!cacheControl) {
    return defaultTtl;
  }

  const maxAgeMatch = cacheControl.match(/max-age\s*=\s*(\d+)/i);
  if (!maxAgeMatch) {
    return defaultTtl;
  }

  const maxAge = parseInt(maxAgeMatch[1], 10);
  if (isNaN(maxAge) || maxAge <= 0) {
    return defaultTtl;
  }

  return Math.min(maxAge, maxTtl);
}

/**
 * Reads JSON from a response with a size limit to prevent DoS attacks.
 * Streams the response body and aborts if it exceeds the limit.
 *
 * @param response - The fetch response
 * @param maxBytes - Maximum allowed size in bytes
 * @returns Parsed JSON object or null if size exceeded or parse failed
 */
export async function readJsonWithSizeLimit(
  response: Response,
  maxBytes: number,
): Promise<Record<string, unknown> | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    console.error("CIMD fetch failed: Response body is null");
    return null;
  }

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        totalSize += value.length;

        if (totalSize > maxBytes) {
          await reader.cancel();
          console.error(
            `CIMD fetch failed: Response exceeded size limit of ${maxBytes} bytes`,
          );
          return null;
        }

        chunks.push(value);
      }
    }

    const allChunks = new Uint8Array(totalSize);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    const text = new TextDecoder().decode(allChunks);
    return JSON.parse(text);
  } catch (error) {
    console.error("CIMD fetch failed: Error reading response body:", error);
    return null;
  }
}

/**
 * Fetches and validates a Client ID Metadata Document from the given URL
 * Per the MCP spec, the client_id in the document must match the URL exactly
 *
 * Features:
 * - KV caching with TTL (respects Cache-Control, max 24h)
 * - Response size limit (5KB per IETF spec)
 * - Does NOT cache errors or invalid documents
 *
 * @param env - Cloudflare Worker environment variables (for KV access)
 * @param metadataUrl - The HTTPS URL to fetch metadata from
 * @returns The client information, or null if not found/invalid
 */
export async function fetchClientMetadataDocument(
  env: any,
  metadataUrl: string,
): Promise<ClientInfo | null> {
  const cacheKey = `cimd:${metadataUrl}`;

  try {
    const cached = await env.OAUTH_KV.get(cacheKey, { type: "json" });
    if (cached) {
      return cached as ClientInfo;
    }
  } catch {
    // Cache miss or error, continue to fetch
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    CIMD_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(metadataUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `CIMD fetch failed: HTTP ${response.status} from ${metadataUrl}`,
      );
      return null;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > CIMD_MAX_SIZE_BYTES) {
      console.error(
        `CIMD fetch failed: Content-Length ${contentLength} exceeds limit of ${CIMD_MAX_SIZE_BYTES} bytes`,
      );
      return null;
    }

    const rawMetadata = await readJsonWithSizeLimit(
      response,
      CIMD_MAX_SIZE_BYTES,
    );

    if (!rawMetadata) {
      return null;
    }

    const metadata = rawMetadata as {
      client_id?: string;
      client_name?: string;
      client_uri?: string;
      logo_uri?: string;
      redirect_uris?: string[];
      grant_types?: string[];
      response_types?: string[];
      token_endpoint_auth_method?: string;
      contacts?: string[];
      policy_uri?: string;
      tos_uri?: string;
      jwks_uri?: string;
    };

    // Validate that client_id matches the URL (required by spec)
    if (metadata.client_id !== metadataUrl) {
      console.error(
        `CIMD validation failed: client_id "${metadata.client_id}" does not match URL "${metadataUrl}"`,
      );
      return null;
    }

    if (!metadata.redirect_uris || metadata.redirect_uris.length === 0) {
      console.error(`CIMD validation failed: redirect_uris is required`);
      return null;
    }

    if (
      metadata.token_endpoint_auth_method &&
      (CIMD_PROHIBITED_AUTH_METHODS as readonly string[]).includes(
        metadata.token_endpoint_auth_method,
      )
    ) {
      console.error(
        `CIMD validation failed: token_endpoint_auth_method "${metadata.token_endpoint_auth_method}" is not allowed for CIMD clients`,
      );
      return null;
    }

    const clientInfo: ClientInfo = {
      clientId: metadata.client_id,
      clientName: metadata.client_name,
      clientUri: metadata.client_uri,
      logoUri: metadata.logo_uri,
      redirectUris: metadata.redirect_uris,
      grantTypes: metadata.grant_types || ["authorization_code"],
      responseTypes: metadata.response_types || ["code"],
      tokenEndpointAuthMethod: metadata.token_endpoint_auth_method || "none",
      contacts: metadata.contacts,
      policyUri: metadata.policy_uri,
      tosUri: metadata.tos_uri,
      jwksUri: metadata.jwks_uri,
    };

    const cacheTtl = parseCacheControlMaxAge(
      response.headers.get("cache-control"),
      CIMD_DEFAULT_CACHE_TTL,
      CIMD_MAX_CACHE_TTL,
    );

    try {
      await env.OAUTH_KV.put(cacheKey, JSON.stringify(clientInfo), {
        expirationTtl: cacheTtl,
      });
    } catch (cacheError) {
      console.error(`CIMD cache write failed for ${metadataUrl}:`, cacheError);
    }

    return clientInfo;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`CIMD fetch error for ${metadataUrl}:`, error);
    return null;
  }
}

/**
 * OAuthエンドポイント共通の認証およびリクエスト解析処理
 * クライアント認証とフォームパースを行う
 */
async function parseAndAuthenticateRequest(
  db: Context<Env>["var"]["db"],
  authHeader: string | undefined,
  contentType: string,
  body: Record<string, string | File>,
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
    clientId = typeof body.client_id === "string" ? body.client_id : "";
    clientSecret =
      typeof body.client_secret === "string" ? body.client_secret : "";
  }

  if (!clientId) {
    throw new HTTPException(401, {
      message: "invalid_client",
    });
  }

  // Fetch client from database
  const client = await getClientFromDB(db, clientId);

  if (!client) {
    throw new HTTPException(401, {
      message: "invalid_client",
    });
  }

  const isPublicClient = client.tokenEndpointAuthMethod === "none";

  // For confidential clients, validate the secret
  if (!isPublicClient) {
    if (!clientSecret) {
      throw new HTTPException(401, {
        message: "invalid_client",
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
        message: "invalid_client",
      });
    }
  }

  return {
    client,
    isPublicClient,
    body,
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

    if (authCode.redirectUri !== redirectUri) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    if (authCode.expiresAt < new Date()) {
      throw new HTTPException(400, { message: "invalid_grant" });
    }

    // PKCE が使用されているかどうかを確認
    const isPkceEnabled = !!authCode.codeChallenge;

    // パブリッククライアントはPKCEが必須
    const isPublicClient = client.tokenEndpointAuthMethod === "none";
    if (isPublicClient && !isPkceEnabled) {
      throw new HTTPException(400, { message: "invalid_request" });
    }

    if (!client.redirectUris.includes(redirectUri)) {
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
        message: "invalid_client",
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

/**
 * リダイレクトURIが危険なスキーム（疑似スキーム）を使っていないか検証するための関数。
 * URIの前後の空白を取り除き、大文字小文字を区別せずスキームを判定することでバイパス攻撃を防ぎます。
 * RFC 3986に従い、制御文字（コントロールキャラクタ）がURI内に含まれていた場合は除去せずエラーとして拒否します。
 * @param redirectUri - 検証対象のリダイレクトURI
 * @throws 危険なスキームまたは制御文字が含まれていた場合はエラーを投げます
 */
export function validateRedirectUriScheme(redirectUri: string): void {
  // List of dangerous pseudo-schemes that should not be allowed
  const dangerousSchemes = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "mailto:",
    "blob:",
  ];

  // 1. Trim leading and trailing whitespace (allowed per RFC 3986 preprocessing)
  const normalized = redirectUri.trim();

  // 2. Reject URIs containing control characters (RFC 3986 compliance)
  // Control characters (0x00-0x1F, 0x7F-0x9F) are explicitly disallowed in URIs
  // and their presence indicates a malformed or potentially malicious URI
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if ((code >= 0x00 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f)) {
      throw new Error("Invalid redirect URI");
    }
  }

  // 3. Extract the scheme by finding everything before the first ':'
  const colonIndex = normalized.indexOf(":");
  if (colonIndex === -1) {
    // No scheme present - reject relative URIs
    throw new Error("Invalid redirect URI");
  }

  // Get the scheme and convert to lowercase for case-insensitive comparison
  const scheme = normalized.substring(0, colonIndex + 1).toLowerCase();

  // Check against blacklist
  for (const dangerousScheme of dangerousSchemes) {
    if (scheme === dangerousScheme) {
      throw new Error("Invalid redirect URI");
    }
  }
}

app
  .post(
    "/register",
    bodyLimit({
      maxSize: 1048576, // 1 MiB
      onError: () => {
        throw new HTTPException(413, { message: "invalid_request" });
      },
    }),
    zValidator(
      "json",
      z.object({
        client_name: z.string().min(1),
        redirect_uris: z.array(z.url()).min(1),
        token_endpoint_auth_method: z
          .enum(["client_secret_basic", "client_secret_post", "none"])
          .optional()
          .default("client_secret_basic"),
        grant_types: z
          .array(z.string())
          .optional()
          .default(["authorization_code", "refresh_token"]),
        response_types: z.array(z.string()).optional().default(["code"]),
      }),
    ),
    async (c) => {
      const {
        client_name,
        redirect_uris,
        grant_types,
        response_types,
        token_endpoint_auth_method,
      } = c.req.valid("json");

      // パブリッククライアントかどうか判定する
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

      for (const uri of redirect_uris) {
        validateRedirectUriScheme(uri);
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
          grantTypes: grant_types,
          responseTypes: response_types,
          tokenEndpointAuthMethod: token_endpoint_auth_method,
        })
        .returning();

      // Return response based on client type
      const response: {
        client_id: string;
        client_secret?: string;
        redirect_uris: string[];
        response_types: string[];
        grant_types: string[];
      } = {
        client_id: newClient.clientId,
        redirect_uris,
        grant_types,
        response_types,
      };

      // Only include client_secret for confidential clients
      if (clientSecret) {
        response.client_secret = clientSecret;
      }

      return c.json(response);
    },
  )
  .post("/token", zValidator("form", tokenGrantSchema), async (ctx) => {
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
