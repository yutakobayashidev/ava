import { authMiddleware } from "@/middleware/auth";
import { onboardingMiddleware } from "@/middleware/onboarding";
import { rewriteMarkdownMiddleware } from "@/middleware/rewrite-markdown";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { NextRequest, NextResponse } from "next/server";

const app = new Hono();

app.use("*", rewriteMarkdownMiddleware);
app.use("*", authMiddleware);
app.use("*", onboardingMiddleware);

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
