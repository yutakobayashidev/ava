import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的ファイルやAPIルートはスキップ
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  // ログインページとOAuthフローはスキップ
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/oauth") ||
    pathname.startsWith("/slack/install")
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
