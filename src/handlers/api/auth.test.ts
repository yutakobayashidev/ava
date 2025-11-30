import { describe, it, expect } from "vitest";
import { setup } from "../../../tests/vitest.helper";
import app from "@/handlers/api/auth";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import {
  generateSessionToken,
  createSession,
} from "@/usecases/auth/loginWithSlack";

const { db, createTestUserAndWorkspace } = await setup();

describe("api/auth", () => {
  describe("POST /logout", () => {
    it("should logout successfully with valid session", async () => {
      // テストユーザーとワークスペースを作成
      const { user } = await createTestUserAndWorkspace();

      // セッションを作成
      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      // ログアウトリクエスト
      const res = await app.request("/logout", {
        method: "POST",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      // レスポンスを確認
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "success": true,
        }
      `);

      // クッキーが削除されたことを確認
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("session=");
      expect(setCookieHeader).toContain("Max-Age=0");

      // セッションが DB から削除されたことを確認
      const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(sessionToken)),
      );
      const sessions = await db.query.sessions.findMany({
        where: (t, { eq }) => eq(t.id, sessionId),
      });
      expect(sessions).toHaveLength(0);
    });

    it("should logout successfully without session cookie", async () => {
      // セッションクッキーなしでログアウトリクエスト
      const res = await app.request("/logout", {
        method: "POST",
      });

      // レスポンスを確認
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "success": true,
        }
      `);

      // クッキーが削除されたことを確認
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("session=");
      expect(setCookieHeader).toContain("Max-Age=0");
    });

    it("should logout successfully with invalid session token", async () => {
      // 存在しないセッショントークンでログアウトリクエスト
      const res = await app.request("/logout", {
        method: "POST",
        headers: {
          Cookie: "session=invalid-token",
        },
      });

      // レスポンスを確認
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "success": true,
        }
      `);

      // クッキーが削除されたことを確認
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("session=");
      expect(setCookieHeader).toContain("Max-Age=0");
    });
  });
});
