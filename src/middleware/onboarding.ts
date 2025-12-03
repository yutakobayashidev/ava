import { getCurrentSession } from "@/lib/session";
import { MiddlewareHandler } from "hono";
import { NextRequest, NextResponse } from "next/server";

export const onboardingMiddleware: MiddlewareHandler = async (c, next) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const request = c.req.raw as NextRequest;
  const { pathname } = request.nextUrl;
  const { user } = await getCurrentSession();

  if (!user) return next();

  const isOnboardingPath = pathname.startsWith("/onboarding");
  const completed = !!user.onboardingCompletedAt;

  if (!completed && !isOnboardingPath) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (completed && isOnboardingPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return next();
};
