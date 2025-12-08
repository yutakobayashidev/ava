import * as sessionLib from "@/lib/server/session";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMiddleware } from "./auth";

vi.mock("server-only", () => ({}));

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip authentication for /login path", async () => {
    const app = new Hono();
    app.get("/login", authMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/login", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should skip authentication for /api path", async () => {
    const app = new Hono();
    app.get("/api/test", authMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/api/test", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should skip authentication for /oauth path", async () => {
    const app = new Hono();
    app.get("/oauth/test", authMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/oauth/test", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should skip authentication for /mcp path", async () => {
    const app = new Hono();
    app.get("/mcp", authMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/mcp", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should skip authentication for /.well-known path", async () => {
    const app = new Hono();
    app.get("/.well-known/test", authMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/.well-known/test", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should redirect unauthenticated user to /login when accessing /onboarding", async () => {
    vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue({
      session: null,
      user: null,
    });

    const app = new Hono();
    app.get("/onboarding", authMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/onboarding", {
      method: "GET",
      headers: { Cookie: "session=test-token" },
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=%2Fonboarding");
  });

  it("should redirect unauthenticated user to /login when accessing /onboarding/setup", async () => {
    vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue({
      session: null,
      user: null,
    });

    const app = new Hono();
    app.get("/onboarding/setup", authMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/onboarding/setup", {
      method: "GET",
      headers: { Cookie: "session=test-token" },
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=%2Fonboarding%2Fsetup");
  });

  it("should allow unauthenticated user to access non-onboarding paths", async () => {
    vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue({
      session: null,
      user: null,
    });

    const app = new Hono();
    app.get("/dashboard", authMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/dashboard", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should allow authenticated user to access /onboarding", async () => {
    vi.spyOn(sessionLib, "validateSessionToken").mockResolvedValue({
      session: {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
      },
      user: {
        id: "user-1",
        name: null,
        email: null,
        slackId: "U123",
        slackTeamId: "T123",
        workspaceId: "workspace-1",
        image: null,
        stripeId: null,
        onboardingCompletedAt: null,
        createdAt: new Date(),
      },
    });

    const app = new Hono();
    app.get("/onboarding", authMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/onboarding", {
      method: "GET",
      headers: { Cookie: "session=test-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
