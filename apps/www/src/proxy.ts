import { aiBots } from "@hono/ua-blocker/ai-bots";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { handle } from "hono/vercel";
import { NextRequest, NextResponse } from "next/server";
import { validateSessionToken } from "./lib/server/session";

const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

/**
 * Markdownリライトミドルウェア
 *
 * AIボットまたはMarkdownを優先するクライアント向けに
 * /docs/* のパスを /llms.mdx/* へリライトする
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

export const authMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;

  // API や fetch リクエストではリダイレクトさせない
  const isHTML = c.req.header("accept")?.includes("text/html");

  const token = getCookie(c, "session");
  const { user } = token ? await validateSessionToken(token) : { user: null };

  const isOnboardingPath = path.startsWith("/onboarding");
  const completed = !!user?.onboardingCompletedAt;

  // 未ログインユーザーが /onboarding に来たらログインへ
  if (!user && isOnboardingPath) {
    if (isHTML) {
      const loginUrl = new URL("/login", c.req.url);
      loginUrl.searchParams.set("callbackUrl", path);
      return c.redirect(loginUrl.toString());
    }
    return next();
  }

  // ログイン済み & 未完了ユーザーをオンボーディングへ誘導
  if (user && !completed && !isOnboardingPath) {
    if (isHTML) {
      return c.redirect(new URL("/onboarding", c.req.url));
    }
    return next();
  }

  // 完了済みユーザーが /onboarding に来たらダッシュボードへ
  if (user && completed && isOnboardingPath) {
    if (isHTML) {
      return c.redirect(new URL("/dashboard", c.req.url));
    }
    return next();
  }

  return next();
});

const app = new Hono();

app.use("*", rewriteMarkdownMiddleware);
app.use("*", authMiddleware);

app.all("*", (ctx) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const req = ctx.req.raw as NextRequest;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", ctx.req.path);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
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
