import { describe, it, expect, beforeEach, vi } from "vitest";
import { setup } from "../../../tests/vitest.helper";

import app from "@/handlers/api/auth";
import {
  generateSessionToken,
  createSession,
} from "@/usecases/auth/loginWithSlack";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

const { mockGenerateState, mockCreateAuthorizationURL, mockLoginWithSlack } =
  vi.hoisted(() => ({
    mockGenerateState: vi.fn(() => "mock-state-12345"),
    mockCreateAuthorizationURL: vi.fn(
      (state: string) =>
        new URL(`https://slack.com/oauth/v2/authorize?state=${state}`),
    ),
    mockLoginWithSlack: vi.fn(),
  }));

const { db, createTestUserAndWorkspace } = await setup();

describe("api/auth", () => {
  beforeEach(() => {
    // Mock arctic module
    vi.mock("arctic", () => ({
      generateState: mockGenerateState,
    }));

    // Mock slack oauth
    vi.mock("@/lib/oauth", () => ({
      slack: {
        createAuthorizationURL: mockCreateAuthorizationURL,
      },
    }));

    // Mock loginWithSlack usecase
    vi.mock("@/usecases/auth/loginWithSlack", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@/usecases/auth/loginWithSlack")>();
      return {
        ...actual,
        loginWithSlack: mockLoginWithSlack,
      };
    });

    // Suppress console output during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET /slack", () => {
    it("should redirect to Slack OAuth URL with state cookie", async () => {
      const res = await app.request("/slack", {
        method: "GET",
      });

      // Check redirect
      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("https://slack.com/oauth/v2/authorize");
      expect(location).toContain("state=mock-state-12345");

      // Check state cookie is set
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("slack_oauth_state=mock-state-12345");
      expect(setCookieHeader).toContain("HttpOnly");
      expect(setCookieHeader).toContain("Path=/");
      expect(setCookieHeader).toContain("Max-Age=600"); // 10 minutes
    });
  });

  describe("GET /slack/callback", () => {
    it("should login successfully with valid code and state", async () => {
      // Mock successful login
      mockLoginWithSlack.mockResolvedValueOnce({
        success: true,
        sessionToken: "test-session-token",
        session: {
          id: "test-session-id",
          userId: "test-user-id",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: new Date(),
        },
      });

      const res = await app.request(
        "/slack/callback?code=test-code&state=valid-state",
        {
          method: "GET",
          headers: {
            Cookie: "slack_oauth_state=valid-state",
          },
        },
      );

      // Check redirect to home
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/");

      // Check session cookie is set
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("session=test-session-token");
      expect(setCookieHeader).toContain("HttpOnly");
      expect(setCookieHeader).toContain("Path=/");

      // Verify loginWithSlack was called
      expect(mockLoginWithSlack).toHaveBeenCalledWith(
        { code: "test-code" },
        expect.any(Object),
      );
    });

    it("should return 400 when state is missing", async () => {
      const res = await app.request("/slack/callback?code=test-code", {
        method: "GET",
        headers: {
          Cookie: "slack_oauth_state=valid-state",
        },
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Bad request");
    });

    it("should return 400 when state cookie is missing", async () => {
      const res = await app.request(
        "/slack/callback?code=test-code&state=valid-state",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Bad request");
    });

    it("should return 400 when state does not match", async () => {
      const res = await app.request(
        "/slack/callback?code=test-code&state=different-state",
        {
          method: "GET",
          headers: {
            Cookie: "slack_oauth_state=valid-state",
          },
        },
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Bad request");
    });

    it("should return 400 when code is missing", async () => {
      const res = await app.request("/slack/callback?state=valid-state", {
        method: "GET",
        headers: {
          Cookie: "slack_oauth_state=valid-state",
        },
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Bad request");
    });

    it("should return 400 when loginWithSlack fails", async () => {
      // Mock failed login
      mockLoginWithSlack.mockResolvedValueOnce({
        success: false,
        error: "invalid_code",
      });

      const res = await app.request(
        "/slack/callback?code=test-code&state=valid-state",
        {
          method: "GET",
          headers: {
            Cookie: "slack_oauth_state=valid-state",
          },
        },
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Please restart the process.");
    });
  });

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

    it("should return 401 without session cookie", async () => {
      // セッションクッキーなしでログアウトリクエスト
      const res = await app.request("/logout", {
        method: "POST",
      });

      // レスポンスを確認
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "Unauthorized",
        }
      `);
    });

    it("should return 401 with invalid session token", async () => {
      // 存在しないセッショントークンでログアウトリクエスト
      const res = await app.request("/logout", {
        method: "POST",
        headers: {
          Cookie: "session=invalid-token",
        },
      });

      // レスポンスを確認
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "Unauthorized",
        }
      `);
    });
  });
});
