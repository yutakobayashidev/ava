import type { Database } from "@/clients/drizzle";
import * as schema from "@/db/schema";
import { uuidv7 } from "uuidv7";

/**
 * Maximum size for CIMD metadata documents (5KB per IETF spec recommendation)
 */
export const CIMD_MAX_SIZE_BYTES = 5 * 1024;

/**
 * Default cache TTL for CIMD metadata (1 hour in seconds)
 */
export const CIMD_DEFAULT_CACHE_TTL = 3600;

/**
 * Maximum cache TTL for CIMD metadata (24 hours in seconds, per spec recommendation)
 */
export const CIMD_MAX_CACHE_TTL = 24 * 60 * 60;

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

export function isClientMetadataUrl(clientId: string): boolean {
  try {
    const url = new URL(clientId);
    return url.protocol === "https:" && url.pathname !== "/";
  } catch {
    return false;
  }
}

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

export async function fetchClientMetadataDocument(
  db: Database,
  metadataUrl: string,
): Promise<typeof schema.clients.$inferSelect | null> {
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

    const cacheTtl = parseCacheControlMaxAge(
      response.headers.get("cache-control"),
      CIMD_DEFAULT_CACHE_TTL,
      CIMD_MAX_CACHE_TTL,
    );

    const cimdCachedUntil = new Date(Date.now() + cacheTtl * 1000);

    // DBにupsert（外部キー制約を満たす + キャッシュ）
    try {
      const [upsertedClient] = await db
        .insert(schema.clients)
        .values({
          id: uuidv7(),
          clientId: metadata.client_id,
          clientSecret: null, // CIMDクライアントはclient_secretを使わない
          name: metadata.client_name || metadata.client_id,
          redirectUris: metadata.redirect_uris,
          grantTypes: metadata.grant_types || [
            "authorization_code",
            "refresh_token",
          ],
          responseTypes: metadata.response_types || ["code"],
          tokenEndpointAuthMethod:
            metadata.token_endpoint_auth_method || "none",
          isCimd: true,
          cimdCachedUntil,
        })
        .onConflictDoUpdate({
          target: schema.clients.clientId,
          set: {
            name: metadata.client_name || metadata.client_id,
            redirectUris: metadata.redirect_uris,
            grantTypes: metadata.grant_types || [
              "authorization_code",
              "refresh_token",
            ],
            responseTypes: metadata.response_types || ["code"],
            tokenEndpointAuthMethod:
              metadata.token_endpoint_auth_method || "none",
            cimdCachedUntil,
            updatedAt: new Date(),
          },
        })
        .returning();

      return upsertedClient;
    } catch (dbError) {
      console.error(`CIMD DB upsert failed for ${metadataUrl}:`, dbError);
      return null;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`CIMD fetch error for ${metadataUrl}:`, error);
    return null;
  }
}
