import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { rewriteMarkdownMiddleware } from "./rewrite-markdown";

// Next.js の実験的テストヘルパーに基づくヘルパー関数
// NextResponse.rewrite() は 'x-middleware-rewrite' ヘッダーを設定する
const isRewrite = (response: Response): boolean => {
  return Boolean(response.headers.get("x-middleware-rewrite"));
};

const getRewrittenUrl = (response: Response): string | null => {
  return response.headers.get("x-middleware-rewrite");
};

describe("rewriteMarkdownMiddleware", () => {
  it("should rewrite for GPTBot user-agent", async () => {
    const app = new Hono();
    app.get("/docs/test", rewriteMarkdownMiddleware, (c) =>
      c.json({ success: true }),
    );

    // GPTBot is in the AI bots list, should trigger rewrite
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

    // ClaudeBot is in the AI bots list
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

    // Markdown Accept header should trigger rewrite
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

    // Even with GPTBot, non-/docs paths should not be rewritten
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
