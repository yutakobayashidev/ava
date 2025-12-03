import { getCurrentSession } from "@/lib/session";
import { MiddlewareHandler } from "hono";
import { NextRequest, NextResponse } from "next/server";

const SKIP_PATHS = [
  "/login",
  "/oauth",
  "/slack/install",
  "/api",
  "/mcp",
  "/.well-known",
];

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const request = c.req.raw as NextRequest;
  const { pathname } = request.nextUrl;

  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) {
    return next();
  }

  const { user } = await getCurrentSession();

  // 未ログイン時のオンボーディングアクセスは強制ログイン
  if (!user && pathname.startsWith("/onboarding")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // 未ログインなら通してページ側のSSRに任せる
  return next();
};
