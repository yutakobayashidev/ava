import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";

const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  // ログインページとOAuthフロー、APIルートはスキップ
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/oauth") ||
    pathname.startsWith("/slack/install") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/mcp") ||
    pathname.startsWith("/.well-known")
  ) {
    return NextResponse.next();
  }

  const { user } = await getCurrentSession();

  // 未認証の場合
  if (!user) {
    // オンボーディングページへのアクセスはログインへ
    if (pathname.startsWith("/onboarding")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 認証済みの場合のオンボーディングチェック
  const isOnboardingPath = pathname.startsWith("/onboarding");
  const hasCompletedOnboarding = !!user.onboardingCompletedAt;

  // オンボーディング未完了でオンボーディング以外のページにアクセス
  if (!hasCompletedOnboarding && !isOnboardingPath) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // オンボーディング完了済みでオンボーディングページにアクセス
  if (hasCompletedOnboarding && isOnboardingPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

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
