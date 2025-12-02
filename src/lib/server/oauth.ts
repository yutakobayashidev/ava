import { z } from "zod";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/clients/drizzle";
import { absoluteUrl } from "@/lib/utils";
import { serializeSearchParams } from "@/utils/urls";
import {
  isCimdClientId,
  fetchCimdDocumentWithCache,
  type CimdDocument,
} from "./cimd";

export const authorizeRequestSchema = z
  .object({
    client_id: z.string().min(1, "Missing client_id"),
    redirect_uri: z.url({ message: "redirect_uri must be a valid URL" }),
    response_type: z
      .string()
      .refine((responseType) => responseType === "code", {
        message: "response_type must be 'code'",
      }),
    state: z.string().max(1024).optional(),
    code_challenge: z.string().max(190).optional(),
    code_challenge_method: z
      .string()
      .refine((method) => method === "S256", {
        message: "code_challenge_method must be 'S256'",
      })
      .optional(),
  })
  .refine(
    (data) => {
      // code_challenge_methodが提供された場合、code_challengeも必須
      if (data.code_challenge_method && !data.code_challenge) {
        return false;
      }
      // code_challengeが提供された場合、code_challenge_methodも必須
      if (data.code_challenge && !data.code_challenge_method) {
        return false;
      }
      return true;
    },
    {
      message:
        "code_challengeとcode_challenge_methodは両方提供する必要があります",
    },
  );

export type ClientInfo =
  | {
      type: "registered";
      data: typeof schema.clients.$inferSelect;
    }
  | {
      type: "cimd";
      data: CimdDocument;
    };

export type ValidateAuthorizeRequestResult =
  | {
      success: true;
      requestParams: z.infer<typeof authorizeRequestSchema>;
      client: ClientInfo;
    }
  | {
      success: false;
      error: string;
      errorDescription?: string;
    };

export const validateAuthorizeRequest = async (
  params: Record<string, unknown>,
): Promise<ValidateAuthorizeRequestResult> => {
  const request = authorizeRequestSchema.safeParse(params);

  if (!request.success) {
    return {
      success: false,
      error: "invalid_request",
      errorDescription:
        "client_id、redirect_uri が不足しているか、response_typeがcodeではありません。",
    };
  }

  const { client_id: clientId, redirect_uri: redirectUri } = request.data;

  // CIMD (Client ID Metadata Document) のチェック
  if (isCimdClientId(clientId)) {
    const cimdResult = await fetchCimdDocumentWithCache(clientId);

    if (!cimdResult.success) {
      return {
        success: false,
        error: cimdResult.error,
        errorDescription: cimdResult.errorDescription,
      };
    }

    const cimdDocument = cimdResult.document;

    // redirect_uri の検証（CIMD ドキュメント内の redirect_uris と完全一致）
    if (!cimdDocument.redirect_uris.includes(redirectUri)) {
      return {
        success: false,
        error: "invalid_request",
        errorDescription: "リダイレクトURIが登録されていません。",
      };
    }

    return {
      success: true,
      requestParams: request.data,
      client: {
        type: "cimd",
        data: cimdDocument,
      },
    };
  }

  // 従来の登録済みクライアント
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.clientId, clientId));

  if (!client) {
    return {
      success: false,
      error: "invalid_client",
      errorDescription: "不正なクライアントです。",
    };
  }

  if (!client.redirectUris.includes(redirectUri)) {
    return {
      success: false,
      error: "invalid_request",
      errorDescription: "リダイレクトURIが登録されていません。",
    };
  }

  return {
    success: true,
    requestParams: request.data,
    client: {
      type: "registered",
      data: client,
    },
  };
};

/**
 * ログインページへリダイレクトするためのURLを作成する
 * OAuth認可リクエストのパラメータを保持したコールバックURLを含む
 */
export const createLoginRedirectUrl = (
  params: Record<string, unknown>,
): string => {
  const base = absoluteUrl("");

  // 文字列型のパラメータのみを抽出
  const stringParams = Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  const callbackUrl = serializeSearchParams(
    base,
    "/oauth/authorize",
    stringParams,
  );
  return serializeSearchParams(base, "/login", { callbackUrl });
};
