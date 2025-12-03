import { getCurrentSession } from "@/lib/session";
import { createMiddleware } from "hono/factory";
import { NextResponse } from "next/server";

export const onboardingMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;
  const { user } = await getCurrentSession();

  if (!user) return next();

  const isOnboardingPath = path.startsWith("/onboarding");
  const completed = !!user.onboardingCompletedAt;

  if (!completed && !isOnboardingPath) {
    return NextResponse.redirect(new URL("/onboarding", c.req.url));
  }

  if (completed && isOnboardingPath) {
    return NextResponse.redirect(new URL("/dashboard", c.req.url));
  }

  await next();
});
