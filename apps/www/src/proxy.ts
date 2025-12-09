import { aiBots } from "@hono/ua-blocker/ai-bots";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { handle } from "hono/vercel";
import { NextRequest, NextResponse } from "next/server";
import { validateSessionToken } from "./lib/server/session";

const app = new Hono();

// 認証・オンボーディングチェックをスキップするパス
const SKIP_PATHS = ["/login", "/oauth", "/api", "/mcp", "/.well-known"];

const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

/**
 * Markdownリライトミドルウェア: AIボットまたはMarkdown Acceptヘッダーの場合、/docs -> /llms.mdx にリライト
 */
export const rewriteMarkdownMiddleware = createMiddleware(async (c, next) => {
  const ua = c.req.header("User-Agent")?.toUpperCase();
  const pathname = c.req.path;

  if ((ua && aiBots.test(ua)) || isMarkdownPreferred(c.req.raw)) {
    const result = rewriteLLM(pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, c.req.url));
    }
  }

  await next();
});

/**
 * 認証チェック + オンボーディングチェック
 */
export const authAndOnboardingMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;

  // スキップ対象
  if (SKIP_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }

  const token = getCookie(c, "session");
  const { user } = token ? await validateSessionToken(token) : { user: null };

  // 未ログインユーザーのオンボーディング → /login へ
  if (!user && path.startsWith("/onboarding")) {
    const loginUrl = new URL("/login", c.req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl.toString());
  }

  // ログイン済みユーザーのオンボーディングチェック
  if (user) {
    const isOnboardingPath = path.startsWith("/onboarding");
    const completed = !!user.onboardingCompletedAt;

    // オンボーディング未完了 & 非オンボーディングパス → /onboarding へ
    if (!completed && !isOnboardingPath) {
      return NextResponse.redirect(new URL("/onboarding", c.req.url));
    }

    // オンボーディング完了済み & オンボーディングパス → /dashboard へ
    if (completed && isOnboardingPath) {
      return NextResponse.redirect(new URL("/dashboard", c.req.url));
    }
  }

  await next();
});

app.use("*", rewriteMarkdownMiddleware);
app.use("*", authAndOnboardingMiddleware);

app.all("*", (ctx) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const req = ctx.req.raw as NextRequest;
  return NextResponse.next({
    request: req,
  });
});

export const proxy = handle(app);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
