import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { onboardingMiddleware } from "./onboarding";
import * as sessionLib from "@/lib/session";

vi.mock("server-only", () => ({}));

describe("onboardingMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow unauthenticated user to pass through", async () => {
    vi.spyOn(sessionLib, "getCurrentSession").mockResolvedValue({
      session: null,
      user: null,
    });

    const app = new Hono();
    app.get("/dashboard", onboardingMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/dashboard", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should redirect incomplete onboarding user to /onboarding when accessing other paths", async () => {
    vi.spyOn(sessionLib, "getCurrentSession").mockResolvedValue({
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
        onboardingCompletedAt: null, // Not completed
        createdAt: new Date(),
      },
    });

    const app = new Hono();
    app.get("/dashboard", onboardingMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/dashboard", { method: "GET" });

    expect(res.status).toBe(307); // NextResponse.redirect uses 307
    const location = res.headers.get("Location");
    expect(location).toContain("/onboarding");
  });

  it("should allow incomplete onboarding user to access /onboarding", async () => {
    vi.spyOn(sessionLib, "getCurrentSession").mockResolvedValue({
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
    app.get("/onboarding", onboardingMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/onboarding", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should redirect completed onboarding user to /dashboard when accessing /onboarding", async () => {
    vi.spyOn(sessionLib, "getCurrentSession").mockResolvedValue({
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
        onboardingCompletedAt: new Date(), // Completed
        createdAt: new Date(),
      },
    });

    const app = new Hono();
    app.get("/onboarding", onboardingMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/onboarding", { method: "GET" });

    expect(res.status).toBe(307);
    const location = res.headers.get("Location");
    expect(location).toContain("/dashboard");
  });

  it("should allow completed onboarding user to access other paths", async () => {
    vi.spyOn(sessionLib, "getCurrentSession").mockResolvedValue({
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
        onboardingCompletedAt: new Date(),
        createdAt: new Date(),
      },
    });

    const app = new Hono();
    app.get("/dashboard", onboardingMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/dashboard", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should allow incomplete onboarding user to access API endpoints", async () => {
    vi.spyOn(sessionLib, "getCurrentSession").mockResolvedValue({
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
        onboardingCompletedAt: null, // Not completed
        createdAt: new Date(),
      },
    });

    const app = new Hono();
    app.get("/api/slack/install/start", onboardingMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/api/slack/install/start", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should allow incomplete onboarding user to access all API paths", async () => {
    vi.spyOn(sessionLib, "getCurrentSession").mockResolvedValue({
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
        onboardingCompletedAt: null, // Not completed
        createdAt: new Date(),
      },
    });

    const app = new Hono();
    app.get("/api/health", onboardingMiddleware, (c) =>
      c.json({ success: true }),
    );

    const res = await app.request("/api/health", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
