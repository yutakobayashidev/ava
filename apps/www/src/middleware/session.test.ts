import { beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "../../tests/vitest.helper";

// vitest.helperの後にインポートする
import { createHonoApp } from "@/create-app";
import * as schema from "@ava/database/schema";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { uuidv7 } from "uuidv7";
import { sessionMiddleware } from "./session";

const { db, createTestUserAndWorkspace } = await setup();

describe("sessionMiddleware", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should reject request without session cookie", async () => {
    const app = createHonoApp();
    app.get("/test", sessionMiddleware(), (c) => c.json({ success: true }));

    const res = await app.request("/test", {
      method: "GET",
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("should reject request with invalid session token", async () => {
    const app = createHonoApp();
    app.get("/test", sessionMiddleware(), (c) => c.json({ success: true }));

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Cookie: "session=invalid_token",
      },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Invalid or expired session",
    });
  });

  it("should reject request with expired session", async () => {
    const app = createHonoApp();
    app.get("/test", sessionMiddleware(), (c) => c.json({ success: true }));

    const { user } = await createTestUserAndWorkspace();

    // 期限切れセッションを作成
    const token = encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() - 1000), // 既に期限切れ
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Cookie: `session=${token}`,
      },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Invalid or expired session",
    });
  });

  it("should allow request with valid session and workspace", async () => {
    const app = createHonoApp();
    app.get("/test", sessionMiddleware({ requiredWorkspace: true }), (c) => {
      const user = c.get("user");
      const workspace = c.get("workspace");
      return c.json({
        success: true,
        user: { id: user.id, name: user.name },
        workspace: { id: workspace.id, name: workspace.name },
      });
    });

    const { user, workspace } = await createTestUserAndWorkspace();

    // 有効なセッションを作成
    const token = encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Cookie: `session=${token}`,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.id).toBe(user.id);
    expect(data.user.name).toBe("Test User");
    expect(data.workspace.id).toBe(workspace.id);
    expect(data.workspace.name).toBe("Test Workspace");
  });

  it("should extend session when near expiration", async () => {
    const app = createHonoApp();
    app.get("/test", sessionMiddleware(), (c) => c.json({ success: true }));

    const { user } = await createTestUserAndWorkspace();

    // 期限切れ間近のセッションを作成（残り14日）
    const token = encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );
    const nearExpiration = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt: nearExpiration,
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Cookie: `session=${token}`,
      },
    });

    expect(res.status).toBe(200);

    // セッションが延長されたことを確認
    const updatedSession = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, sessionId),
    });

    expect(updatedSession).toBeDefined();
    expect(updatedSession!.expiresAt.getTime()).toBeGreaterThan(
      nearExpiration.getTime(),
    );
  });

  it("should allow request without workspace when requiredWorkspace is false", async () => {
    const app = createHonoApp();
    app.get("/test", sessionMiddleware({ requiredWorkspace: false }), (c) => {
      const user = c.get("user");
      return c.json({
        success: true,
        user: { id: user.id, name: user.name },
      });
    });

    const { user } = await createTestUserAndWorkspace();

    // 有効なセッションを作成
    const token = encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Cookie: `session=${token}`,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.id).toBe(user.id);
  });

  it("should reject request when workspace is required but not found", async () => {
    const app = createHonoApp();
    app.get("/test", sessionMiddleware({ requiredWorkspace: true }), (c) =>
      c.json({ success: true }),
    );

    // ワークスペースなしのユーザーを作成
    const [user] = await db
      .insert(schema.users)
      .values({
        id: uuidv7(),
        slackId: "U_NO_WORKSPACE",
        slackTeamId: "T_NO_WORKSPACE",
        workspaceId: null, // ワークスペースなし
      })
      .returning();

    // 有効なセッションを作成
    const token = encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Cookie: `session=${token}`,
      },
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Workspace not found. Please connect Slack workspace.",
    });
  });
});
