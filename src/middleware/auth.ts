import { getCurrentSession } from "@/lib/session";
import { createMiddleware } from "hono/factory";

const SKIP_PATHS = ["/login", "/oauth", "/api", "/mcp", "/.well-known"];

export const authMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;

  // スキップ対象
  if (SKIP_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }

  const { user } = await getCurrentSession();

  // 未ログインユーザーのオンボーディング → /login へ
  if (!user && path.startsWith("/onboarding")) {
    const loginUrl = new URL("/login", c.req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return c.redirect(loginUrl.toString());
  }

  await next();
});
