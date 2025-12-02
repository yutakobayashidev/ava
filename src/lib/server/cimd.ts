import { z } from "zod";

// CIMD (Client ID Metadata Document) のスキーマ
// RFC draft-ietf-oauth-client-id-metadata-document に基づく
export const cimdDocumentSchema = z.object({
  client_id: z.string().url(),
  client_name: z.string().optional(),
  redirect_uris: z.array(z.string()).min(1),
  token_endpoint_auth_method: z
    .union([z.literal("none"), z.literal("private_key_jwt")])
    .optional()
    .default("none"),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  scope: z.string().optional(),
  logo_uri: z.string().url().optional(),
  policy_uri: z.string().url().optional(),
  tos_uri: z.string().url().optional(),
  jwks_uri: z.string().url().optional(),
  jwks: z.record(z.string(), z.unknown()).optional(),
});

export type CimdDocument = z.infer<typeof cimdDocumentSchema>;

// プライベートIPアドレス範囲のチェック（SSRF対策）
const PRIVATE_IP_RANGES = [
  /^127\./, // 127.0.0.0/8 (localhost)
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^::1$/, // IPv6 localhost
  /^fe80:/, // IPv6 link-local
  /^fc00:/, // IPv6 private
];

function isPrivateIp(hostname: string): boolean {
  // IPv6形式のホスト名をチェック
  if (hostname.includes(":")) {
    return PRIVATE_IP_RANGES.some((range) => range.test(hostname));
  }

  // IPv4形式のホスト名をチェック
  return PRIVATE_IP_RANGES.some((range) => range.test(hostname));
}

function isPublicUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // HTTPSのみ許可
    if (url.protocol !== "https:") {
      return false;
    }

    // localhostは許可しない
    if (url.hostname === "localhost") {
      return false;
    }

    // プライベートIPは許可しない
    if (isPrivateIp(url.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * client_id が CIMD URL かどうかを判定
 */
export function isCimdClientId(clientId: string): boolean {
  try {
    const url = new URL(clientId);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export type FetchCimdResult =
  | {
      success: true;
      document: CimdDocument;
    }
  | {
      success: false;
      error: string;
      errorDescription: string;
    };

/**
 * CIMD ドキュメントをフェッチして検証
 */
export async function fetchCimdDocument(
  clientIdUrl: string,
): Promise<FetchCimdResult> {
  // HTTPS URLのみ許可
  if (!clientIdUrl.startsWith("https://")) {
    return {
      success: false as const,
      error: "invalid_client_metadata",
      errorDescription: "client_id must be an HTTPS URL",
    };
  }

  // SSRF対策: パブリックURLであることを確認
  if (!isPublicUrl(clientIdUrl)) {
    return {
      success: false as const,
      error: "invalid_client_metadata",
      errorDescription:
        "client_id must be a public HTTPS URL (private IPs and localhost are not allowed)",
    };
  }

  try {
    // タイムアウトとサイズ制限を設定してフェッチ
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    const response = await fetch(clientIdUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      redirect: "follow", // 最大3回までリダイレクトを許可（デフォルト）
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false as const,
        error: "invalid_client_metadata",
        errorDescription: `Failed to fetch client metadata: HTTP ${response.status}`,
      };
    }

    // Content-Type チェック
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return {
        success: false as const,
        error: "invalid_client_metadata",
        errorDescription: "Client metadata must be application/json",
      };
    }

    // サイズ制限（5KB）
    const text = await response.text();
    if (text.length > 5120) {
      return {
        success: false as const,
        error: "invalid_client_metadata",
        errorDescription: "Client metadata document is too large (max 5KB)",
      };
    }

    // JSON パース
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false as const,
        error: "invalid_client_metadata",
        errorDescription: "Invalid JSON in client metadata document",
      };
    }

    // スキーマ検証
    const parseResult = cimdDocumentSchema.safeParse(json);
    if (!parseResult.success) {
      return {
        success: false as const,
        error: "invalid_client_metadata",
        errorDescription: `Invalid client metadata: ${parseResult.error.message}`,
      };
    }

    const document = parseResult.data;

    // client_id フィールドと URL の一致を確認（仕様上必須）
    if (document.client_id !== clientIdUrl) {
      return {
        success: false as const,
        error: "invalid_client_metadata",
        errorDescription:
          "client_id in metadata document must match the document URL",
      };
    }

    // redirect_uris の検証（すべて有効な HTTPS URL であること）
    for (const uri of document.redirect_uris) {
      try {
        const url = new URL(uri);
        if (url.protocol !== "https:") {
          return {
            success: false as const,
            error: "invalid_client_metadata",
            errorDescription: "All redirect_uris must use HTTPS",
          };
        }
      } catch {
        return {
          success: false as const,
          error: "invalid_client_metadata",
          errorDescription: `Invalid redirect_uri: ${uri}`,
        };
      }
    }

    // token_endpoint_auth_method の検証
    // CIMD では共有シークレット系の認証方法は禁止
    const authMethod = document.token_endpoint_auth_method;
    if (authMethod !== "none" && authMethod !== "private_key_jwt") {
      return {
        success: false as const,
        error: "invalid_client_metadata",
        errorDescription:
          "token_endpoint_auth_method must be 'none' or 'private_key_jwt' for CIMD clients",
      };
    }

    return {
      success: true as const,
      document,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false as const,
          error: "invalid_client_metadata",
          errorDescription: "Timeout while fetching client metadata",
        };
      }
      return {
        success: false as const,
        error: "invalid_client_metadata",
        errorDescription: `Failed to fetch client metadata: ${error.message}`,
      };
    }
    return {
      success: false as const,
      error: "invalid_client_metadata",
      errorDescription: "Unknown error while fetching client metadata",
    };
  }
}

/**
 * メモリキャッシュ（シンプルな実装）
 * プロダクションでは Redis などの外部キャッシュを使用することを推奨
 */
const cimdCache = new Map<
  string,
  { document: CimdDocument; expiresAt: number }
>();

// キャッシュのTTL（15分）
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * キャッシュを使用して CIMD ドキュメントを取得
 */
export async function fetchCimdDocumentWithCache(
  clientIdUrl: string,
): Promise<FetchCimdResult> {
  // キャッシュをチェック
  const cached = cimdCache.get(clientIdUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      success: true,
      document: cached.document,
    };
  }

  // キャッシュにない、または期限切れの場合はフェッチ
  const result = await fetchCimdDocument(clientIdUrl);

  // 成功した場合のみキャッシュに保存
  if (result.success) {
    cimdCache.set(clientIdUrl, {
      document: result.document,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  return result;
}

// 定期的に期限切れのキャッシュをクリーンアップ
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of cimdCache.entries()) {
      if (value.expiresAt <= now) {
        cimdCache.delete(key);
      }
    }
  },
  5 * 60 * 1000,
); // 5分ごと
