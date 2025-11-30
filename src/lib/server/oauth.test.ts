import type { z } from "zod";
import { describe, it, expect, beforeEach } from "vitest";
import { setup } from "../../../tests/vitest.helper";

// vitest.helperの後にインポートする
import {
  validateAuthorizeRequest,
  createLoginRedirectUrl,
  authorizeRequestSchema,
} from "./oauth";
import * as schema from "@/db/schema";
import { uuidv7 } from "uuidv7";

const { db } = await setup();

describe("lib/server/oauth", () => {
  describe("authorizeRequestSchema", () => {
    it("正常なデータの場合は成功する", () => {
      const fixtures: z.input<typeof authorizeRequestSchema>[] = [
        // 最小限の必須パラメータ
        {
          client_id: "test-client-id",
          redirect_uri: "https://example.com/callback",
          response_type: "code",
        },
        // すべてのオプショナルパラメータを含む
        {
          client_id: "test-client-id",
          redirect_uri: "https://example.com/callback",
          response_type: "code",
          state: "random-state-value",
          code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          code_challenge_method: "S256",
        },
        // stateパラメータのみを含む
        {
          client_id: "another-client",
          redirect_uri: "https://app.example.com/oauth/callback",
          response_type: "code",
          state: "csrf-token-12345",
        },
      ];

      for (const fixture of fixtures) {
        expect(authorizeRequestSchema.safeParse(fixture).success).toBeTruthy();
      }
    });

    it("不正なデータの場合は失敗する", () => {
      const fixtures: [z.input<typeof authorizeRequestSchema>, string[]][] = [
        // client_idが空文字列
        [
          {
            client_id: "",
            redirect_uri: "https://example.com/callback",
            response_type: "code",
          },
          ["Missing client_id"],
        ],
        // redirect_uriが不正なURL形式
        [
          {
            client_id: "test-client-id",
            redirect_uri: "not-a-valid-url",
            response_type: "code",
          },
          ["redirect_uri must be a valid URL"],
        ],
        // response_typeが'code'以外
        [
          {
            client_id: "test-client-id",
            redirect_uri: "https://example.com/callback",
            response_type: "token",
          },
          ["response_type must be 'code'"],
        ],
        // code_challenge_methodが'S256'以外
        [
          {
            client_id: "test-client-id",
            redirect_uri: "https://example.com/callback",
            response_type: "code",
            code_challenge: "challenge",
            code_challenge_method: "plain",
          },
          ["code_challenge_method must be 'S256'"],
        ],
        // code_challenge_methodのみ提供（code_challengeなし）
        [
          {
            client_id: "test-client-id",
            redirect_uri: "https://example.com/callback",
            response_type: "code",
            code_challenge_method: "S256",
          },
          ["code_challengeとcode_challenge_methodは両方提供する必要があります"],
        ],
        // code_challengeのみ提供（code_challenge_methodなし）
        [
          {
            client_id: "test-client-id",
            redirect_uri: "https://example.com/callback",
            response_type: "code",
            code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          },
          ["code_challengeとcode_challenge_methodは両方提供する必要があります"],
        ],
      ];

      for (const [fixture, expectedErrors] of fixtures) {
        const res = authorizeRequestSchema.safeParse(fixture);
        expect.assert(!res.success);
        expect(expectedErrors).toEqual(res.error.issues.map((e) => e.message));
      }
    });
  });

  describe("validateAuthorizeRequest", () => {
    let testClient: typeof schema.clients.$inferSelect;

    beforeEach(async () => {
      // テスト用のクライアントを作成
      const [client] = await db
        .insert(schema.clients)
        .values({
          id: uuidv7(),
          clientId: "test-client-id",
          name: "Test Client",
          redirectUris: ["https://example.com/callback"],
        })
        .returning();

      testClient = client;
    });

    it("有効なリクエストとクライアントで成功を返す", async () => {
      const params = {
        client_id: "test-client-id",
        redirect_uri: "https://example.com/callback",
        response_type: "code",
      };

      const result = await validateAuthorizeRequest(params);

      expect(result.success).toBe(true);
      expect(result).toHaveProperty("client");
      expect(result).toHaveProperty("requestParams");
      expect(
        (result as { success: true; client: typeof testClient }).client.id,
      ).toBe(testClient.id);
      expect(
        (
          result as {
            success: true;
            requestParams: { client_id: string };
          }
        ).requestParams.client_id,
      ).toBe("test-client-id");
    });

    it("不正なパラメータでエラーを返す", async () => {
      const params = {
        client_id: "",
        redirect_uri: "not-a-url",
        response_type: "code",
      };

      const result = await validateAuthorizeRequest(params);

      expect.assert(!result.success);
      expect((result as { success: false; error: string }).error).toBe(
        "invalid_request",
      );
      expect(
        (result as { success: false; errorDescription?: string })
          .errorDescription,
      ).toContain("client_id");
    });

    it("存在しないクライアントでエラーを返す", async () => {
      const params = {
        client_id: "non-existent-client",
        redirect_uri: "https://example.com/callback",
        response_type: "code",
      };

      const result = await validateAuthorizeRequest(params);

      expect.assert(!result.success);
      expect((result as { success: false; error: string }).error).toBe(
        "invalid_client",
      );
      expect(
        (result as { success: false; errorDescription?: string })
          .errorDescription,
      ).toContain("不正なクライアント");
    });

    it("登録されていないリダイレクトURIでエラーを返す", async () => {
      const params = {
        client_id: "test-client-id",
        redirect_uri: "https://malicious.com/callback",
        response_type: "code",
      };

      const result = await validateAuthorizeRequest(params);

      expect.assert(!result.success);
      expect((result as { success: false; error: string }).error).toBe(
        "invalid_request",
      );
      expect(
        (result as { success: false; errorDescription?: string })
          .errorDescription,
      ).toContain("リダイレクトURI");
    });
  });

  describe("createLoginRedirectUrl", () => {
    it("パラメータを保持したログインURLを生成する", () => {
      const params = {
        client_id: "test-client-id",
        redirect_uri: "https://example.com/callback",
        response_type: "code",
        state: "random-state",
      };

      const url = createLoginRedirectUrl(params);

      expect(url).toContain("/login");
      expect(url).toContain("callbackUrl=");

      // URLをパースして検証
      const parsedUrl = new URL(url);
      const callbackUrl = parsedUrl.searchParams.get("callbackUrl");
      expect(callbackUrl).toBeTruthy();

      const parsedCallback = new URL(callbackUrl!);
      expect(parsedCallback.pathname).toBe("/oauth/authorize");
      expect(parsedCallback.searchParams.get("client_id")).toBe(
        "test-client-id",
      );
      expect(parsedCallback.searchParams.get("redirect_uri")).toBe(
        "https://example.com/callback",
      );
      expect(parsedCallback.searchParams.get("response_type")).toBe("code");
      expect(parsedCallback.searchParams.get("state")).toBe("random-state");
    });

    it("文字列以外のパラメータは無視される", () => {
      const params = {
        client_id: "test-client-id",
        redirect_uri: "https://example.com/callback",
        response_type: "code",
        numeric_param: 123,
        array_param: ["a", "b"],
        object_param: { key: "value" },
      };

      const url = createLoginRedirectUrl(params);
      const parsedUrl = new URL(url);
      const callbackUrl = parsedUrl.searchParams.get("callbackUrl");

      const parsedCallback = new URL(callbackUrl!);
      // 文字列パラメータのみ含まれる
      expect(parsedCallback.searchParams.get("client_id")).toBe(
        "test-client-id",
      );
      expect(parsedCallback.searchParams.get("redirect_uri")).toBe(
        "https://example.com/callback",
      );
      expect(parsedCallback.searchParams.get("response_type")).toBe("code");
      // 文字列以外は含まれない
      expect(parsedCallback.searchParams.has("numeric_param")).toBe(false);
      expect(parsedCallback.searchParams.has("array_param")).toBe(false);
      expect(parsedCallback.searchParams.has("object_param")).toBe(false);
    });

    it("空のパラメータでもURLを生成できる", () => {
      const params = {};
      const url = createLoginRedirectUrl(params);

      expect(url).toContain("/login");
      expect(url).toContain("callbackUrl=");

      const parsedUrl = new URL(url);
      const callbackUrl = parsedUrl.searchParams.get("callbackUrl");
      expect(callbackUrl).toBeTruthy();

      const parsedCallback = new URL(callbackUrl!);
      expect(parsedCallback.pathname).toBe("/oauth/authorize");
    });
  });
});
