import * as sessionLib from "@/lib/server/session";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
  authAndOnboardingMiddleware,
  rewriteMarkdownMiddleware,
} from "./proxy";

vi.mock("server-only", () => ({}));

// Next.js の実験的テストヘルパーに基づくヘルパー関数
// NextResponse.rewrite() は 'x-middleware-rewrite' ヘッダーを設定する
const isRewrite = (response: Response): boolean => {
  return Boolean(response.headers.get("x-middleware-rewrite"));
};

const getRewrittenUrl = (response: Response): string | null => {
  return response.headers.get("x-middleware-rewrite");
};

describe("proxy", () => {
  describe("rewriteMarkdownMiddleware", () => {
    it("should rewrite for GPTBot user-agent", async () => {
      const app = new Hono();
      app.get("/docs/test", rewriteMarkdownMiddleware, (c) =>
        c.json({ success: true }),
      );

      const res = await app.request("/docs/test", {
        method: "GET",
        headers: {
          "User-Agent": "GPTBot/1.0",
        },
      });

      expect(isRewrite(res)).toBe(true);
      expect(getRewrittenUrl(res)).toContain("/llms.mdx/test");
    });

    it("should rewrite for ClaudeBot user-agent", async () => {
      const app = new Hono();
      app.get("/docs/guide", rewriteMarkdownMiddleware, (c) =>
        c.json({ success: true }),
      );

      const res = await app.request("/docs/guide", {
        method: "GET",
        headers: {
          "User-Agent": "ClaudeBot/1.0",
        },
      });

      expect(isRewrite(res)).toBe(true);
      expect(getRewrittenUrl(res)).toContain("/llms.mdx/guide");
    });

    it("should rewrite for markdown Accept header", async () => {
      const app = new Hono();
      app.get("/docs/api", rewriteMarkdownMiddleware, (c) =>
        c.json({ success: true }),
      );

      const res = await app.request("/docs/api", {
        method: "GET",
        headers: {
          Accept: "text/markdown",
        },
      });

      expect(isRewrite(res)).toBe(true);
      expect(getRewrittenUrl(res)).toContain("/llms.mdx/api");
    });

    it("should not rewrite for regular user-agent", async () => {
      const app = new Hono();
      app.get("/docs/test", rewriteMarkdownMiddleware, (c) =>
        c.json({ success: true }),
      );

      const res = await app.request("/docs/test", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      expect(isRewrite(res)).toBe(false);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it("should not rewrite non-/docs paths even with AI bot", async () => {
      const app = new Hono();
      app.get("/api/test", rewriteMarkdownMiddleware, (c) =>
        c.json({ success: true }),
      );

      const res = await app.request("/api/test", {
        method: "GET",
        headers: {
          "User-Agent": "GPTBot/1.0",
        },
      });

      expect(isRewrite(res)).toBe(false);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it("should not rewrite when user-agent header is missing", async () => {
      const app = new Hono();
      app.get("/docs/test", rewriteMarkdownMiddleware, (c) =>
        c.json({ success: true }),
      );

      const res = await app.request("/docs/test", {
        method: "GET",
      });

      expect(isRewrite(res)).toBe(false);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });
  });

  describe("authAndOnboardingMiddleware", () => {
    describe("SKIP_PATHS", () => {
      it("should skip authentication for /login path", async () => {
        const app = new Hono();
        app.get("/login", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/login", { method: "GET" });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });

      it("should skip authentication for /api path", async () => {
        const app = new Hono();
        app.get("/api/test", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/api/test", { method: "GET" });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });

      it("should skip authentication for /oauth path", async () => {
        const app = new Hono();
        app.get("/oauth/authorize", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/oauth/authorize", { method: "GET" });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });

      it("should skip authentication for /mcp path", async () => {
        const app = new Hono();
        app.get("/mcp", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/mcp", { method: "GET" });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });

      it("should skip authentication for /.well-known path", async () => {
        const app = new Hono();
        app.get("/.well-known/test", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/.well-known/test", { method: "GET" });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });
    });

    describe("Authentication", () => {
      it("should redirect unauthenticated user to /login when accessing /onboarding", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue({
          session: null,
          user: null,
        });

        const app = new Hono();
        app.get("/onboarding", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/onboarding", {
          method: "GET",
          headers: { Cookie: "session=test-token" },
        });

        expect(res.status).toBe(307);
        const location = res.headers.get("Location");
        expect(location).toContain("/login");
        expect(location).toContain("callbackUrl=%2Fonboarding");
      });

      it("should redirect unauthenticated user to /login when accessing /onboarding/setup-mcp", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue({
          session: null,
          user: null,
        });

        const app = new Hono();
        app.get("/onboarding/setup-mcp", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/onboarding/setup-mcp", {
          method: "GET",
          headers: { Cookie: "session=test-token" },
        });

        expect(res.status).toBe(307);
        const location = res.headers.get("Location");
        expect(location).toContain("/login");
        expect(location).toContain("callbackUrl=%2Fonboarding%2Fsetup-mcp");
      });

      it("should allow unauthenticated user to access non-onboarding paths", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue({
          session: null,
          user: null,
        });

        const app = new Hono();
        app.get("/dashboard", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/dashboard", { method: "GET" });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });
    });

    describe("Onboarding - Incomplete", () => {
      const incompleteUser = {
        session: {
          id: "session-1",
          userId: "user-1",
          expiresAt: new Date(Date.now() + 3600 * 1000),
          createdAt: new Date(),
        },
        user: {
          id: "user-1",
          name: null,
          email: null,
          slackId: "U123",
          slackTeamId: "T123",
          workspaceId: "workspace-1",
          image: null,
          stripeId: null,
          onboardingCompletedAt: null, // Not completed
          createdAt: new Date(),
        },
      };

      it("should redirect incomplete onboarding user to /onboarding when accessing /dashboard", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue(
          incompleteUser,
        );

        const app = new Hono();
        app.get("/dashboard", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/dashboard", {
          method: "GET",
          headers: { Cookie: "session=test-token" },
        });

        expect(res.status).toBe(307); // NextResponse.redirect uses 307
        const location = res.headers.get("Location");
        expect(location).toContain("/onboarding");
      });

      it("should allow incomplete onboarding user to access /onboarding", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue(
          incompleteUser,
        );

        const app = new Hono();
        app.get("/onboarding", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/onboarding", {
          method: "GET",
          headers: { Cookie: "session=test-token" },
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });

      it("should allow incomplete onboarding user to access /onboarding subpaths", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue(
          incompleteUser,
        );

        const app = new Hono();
        app.get("/onboarding/setup-mcp", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/onboarding/setup-mcp", {
          method: "GET",
          headers: { Cookie: "session=test-token" },
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });
    });

    describe("Onboarding - Completed", () => {
      const completedUser = {
        session: {
          id: "session-1",
          userId: "user-1",
          expiresAt: new Date(Date.now() + 3600 * 1000),
          createdAt: new Date(),
        },
        user: {
          id: "user-1",
          name: null,
          email: null,
          slackId: "U123",
          slackTeamId: "T123",
          workspaceId: "workspace-1",
          image: null,
          stripeId: null,
          onboardingCompletedAt: new Date(), // Completed
          createdAt: new Date(),
        },
      };

      it("should redirect completed onboarding user to /dashboard when accessing /onboarding", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue(
          completedUser,
        );

        const app = new Hono();
        app.get("/onboarding", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/onboarding", {
          method: "GET",
          headers: { Cookie: "session=test-token" },
        });

        expect(res.status).toBe(307);
        const location = res.headers.get("Location");
        expect(location).toContain("/dashboard");
      });

      it("should allow completed onboarding user to access /dashboard", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue(
          completedUser,
        );

        const app = new Hono();
        app.get("/dashboard", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/dashboard", {
          method: "GET",
          headers: { Cookie: "session=test-token" },
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });

      it("should allow completed onboarding user to access other protected paths", async () => {
        vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue(
          completedUser,
        );

        const app = new Hono();
        app.get("/settings", authAndOnboardingMiddleware, (c) =>
          c.json({ success: true }),
        );

        const res = await app.request("/settings", {
          method: "GET",
          headers: { Cookie: "session=test-token" },
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });
    });
  });
});
