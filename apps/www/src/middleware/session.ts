import { validateSessionToken } from "@/lib/server/session";
import { createWorkspaceRepository } from "@/repos";
import type { HonoEnv } from "@/types";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

interface SessionOptions {
  requiredWorkspace?: boolean;
}

/**
 * Hono用セッション検証ミドルウェア
 * Cookieからセッショントークンを取得し、検証してuserとworkspaceをコンテキストに設定
 */
export const sessionMiddleware = (options: SessionOptions = {}) =>
  createMiddleware<HonoEnv>(async (c, next) => {
    const token = getCookie(c, "session");
    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { user } = await validateSessionToken(token);
    if (!user) {
      throw new HTTPException(401, { message: "Invalid or expired session" });
    }

    c.set("user", user);

    // workspace が必要な場合だけチェック
    const { requiredWorkspace = false } = options;
    if (requiredWorkspace) {
      const db = c.get("db");
      const workspaceRepository = createWorkspaceRepository(db);
      const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

      if (!workspace) {
        throw new HTTPException(403, {
          message: "Workspace not found. Please connect Slack workspace.",
        });
      }

      c.set("workspace", workspace);
    }

    await next();
  });
