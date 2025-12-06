import { users } from "@ava/database/schema";
import app from "@/handlers/api/slack";
import {
  createSession,
  generateSessionToken,
} from "@/usecases/auth/loginWithSlack";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "../../../tests/vitest.helper";

const { db, createTestUserAndWorkspace } = await setup();

const { generateState } = vi.hoisted(() => ({
  generateState: vi.fn(() => "mock-state-12345"),
}));

const { buildSlackInstallUrl } = vi.hoisted(() => ({
  buildSlackInstallUrl: vi.fn(
    (_config: unknown, state: string) =>
      `https://slack.com/oauth/v2/authorize?state=${state}`,
  ),
}));

const { installWorkspace } = vi.hoisted(() => ({
  installWorkspace: vi.fn(),
}));

const { validateSessionToken } = vi.hoisted(() => ({
  validateSessionToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("arctic", () => ({
  generateState,
  Slack: class MockSlack {},
}));

vi.mock("@ava/integrations/slack", async () => {
  const actual = await vi.importActual<
    typeof import("@ava/integrations/slack")
  >("@ava/integrations/slack");
  return {
    ...actual,
    buildSlackInstallUrl,
  };
});

vi.mock("@/usecases/slack/installWorkspace", () => ({
  installWorkspace,
}));

vi.mock("@/lib/server/session", () => ({
  validateSessionToken,
}));

describe("api/slack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET /install/start", () => {
    it("should return 401 when not authenticated", async () => {
      validateSessionToken.mockResolvedValueOnce({ user: null });

      const res = await app.request("/install/start", {
        method: "GET",
      });

      expect(res.status).toBe(401);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "Unauthorized",
        }
      `);
    });

    it("should redirect to Slack OAuth URL with state cookie when authenticated", async () => {
      const { user } = await createTestUserAndWorkspace();
      validateSessionToken.mockResolvedValueOnce({ user });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      const res = await app.request("/install/start", {
        method: "GET",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      // Check redirect
      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("https://slack.com/oauth/v2/authorize");
      expect(location).toContain("state=mock-state-12345");

      // Check state cookie is set
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("slack_install_state=mock-state-12345");
      expect(setCookieHeader).toContain("HttpOnly");
      expect(setCookieHeader).toContain("Path=/");
      expect(setCookieHeader).toContain("Max-Age=600"); // 10 minutes

      // Verify mocks were called
      expect(generateState).toHaveBeenCalled();
      expect(buildSlackInstallUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: expect.any(String),
          clientSecret: expect.any(String),
          redirectUri: expect.any(String),
        }),
        "mock-state-12345",
      );
    });
  });

  describe("GET /install/callback", () => {
    it("should return 401 when not authenticated", async () => {
      validateSessionToken.mockResolvedValueOnce({ user: null });

      const res = await app.request(
        "/install/callback?code=test-code&state=valid-state",
        {
          method: "GET",
          headers: {
            Cookie: "slack_install_state=valid-state",
          },
        },
      );

      expect(res.status).toBe(401);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "Unauthorized",
        }
      `);
    });

    it("should redirect with error when code is missing", async () => {
      const { user } = await createTestUserAndWorkspace();
      // Mark user as onboarded
      const onboardingCompletedAt = new Date();
      await db
        .update(users)
        .set({ onboardingCompletedAt })
        .where(eq(users.id, user.id));

      validateSessionToken.mockResolvedValueOnce({
        user: { ...user, onboardingCompletedAt },
      });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      const res = await app.request("/install/callback?state=valid-state", {
        method: "GET",
        headers: {
          Cookie: `session=${sessionToken}; slack_install_state=valid-state`,
        },
      });

      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("error=missing_code");
      expect(location).toContain("/settings");
    });

    it("should redirect with error when state is missing", async () => {
      const { user } = await createTestUserAndWorkspace();
      // Mark user as onboarded
      const onboardingCompletedAt = new Date();
      await db
        .update(users)
        .set({ onboardingCompletedAt })
        .where(eq(users.id, user.id));

      validateSessionToken.mockResolvedValueOnce({
        user: { ...user, onboardingCompletedAt },
      });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      const res = await app.request("/install/callback?code=test-code", {
        method: "GET",
        headers: {
          Cookie: `session=${sessionToken}; slack_install_state=valid-state`,
        },
      });

      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("error=state_mismatch");
      expect(location).toContain("/settings");
    });

    it("should redirect with error when state cookie is missing", async () => {
      const { user } = await createTestUserAndWorkspace();
      // Mark user as onboarded
      const onboardingCompletedAt = new Date();
      await db
        .update(users)
        .set({ onboardingCompletedAt })
        .where(eq(users.id, user.id));

      validateSessionToken.mockResolvedValueOnce({
        user: { ...user, onboardingCompletedAt },
      });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      const res = await app.request(
        "/install/callback?code=test-code&state=valid-state",
        {
          method: "GET",
          headers: {
            Cookie: `session=${sessionToken}`,
          },
        },
      );

      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("error=state_mismatch");
      expect(location).toContain("/settings");
    });

    it("should redirect with error when state does not match", async () => {
      const { user } = await createTestUserAndWorkspace();
      // Mark user as onboarded
      const onboardingCompletedAt = new Date();
      await db
        .update(users)
        .set({ onboardingCompletedAt })
        .where(eq(users.id, user.id));

      validateSessionToken.mockResolvedValueOnce({
        user: { ...user, onboardingCompletedAt },
      });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      const res = await app.request(
        "/install/callback?code=test-code&state=different-state",
        {
          method: "GET",
          headers: {
            Cookie: `session=${sessionToken}; slack_install_state=valid-state`,
          },
        },
      );

      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("error=state_mismatch");
      expect(location).toContain("/settings");
    });

    it("should install workspace successfully with valid code and state", async () => {
      const { user } = await createTestUserAndWorkspace();
      // Mark user as onboarded
      const onboardingCompletedAt = new Date();
      await db
        .update(users)
        .set({ onboardingCompletedAt })
        .where(eq(users.id, user.id));

      validateSessionToken.mockResolvedValueOnce({
        user: { ...user, onboardingCompletedAt },
      });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      installWorkspace.mockResolvedValueOnce({
        success: true,
        teamName: "Test Team",
      });

      const res = await app.request(
        "/install/callback?code=test-code&state=valid-state",
        {
          method: "GET",
          headers: {
            Cookie: `session=${sessionToken}; slack_install_state=valid-state`,
          },
        },
      );

      // Check redirect
      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("installed=1");
      expect(location).toContain("team=Test+Team");
      expect(location).toContain("/settings");

      // Verify installWorkspace was called
      expect(installWorkspace).toHaveBeenCalledWith(
        {
          code: "test-code",
          userId: user.id,
        },
        expect.any(Object),
      );

      // Check state cookie is cleared
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("slack_install_state=");
      expect(setCookieHeader).toContain("Max-Age=0");
    });

    it("should redirect to onboarding when user is not onboarded and install succeeds", async () => {
      const { user } = await createTestUserAndWorkspace();
      // Update user to mark as not onboarded
      await db
        .update(users)
        .set({ onboardingCompletedAt: null })
        .where(eq(users.id, user.id));

      validateSessionToken.mockResolvedValueOnce({ user });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      installWorkspace.mockResolvedValueOnce({
        success: true,
        teamName: "Test Team",
      });

      const res = await app.request(
        "/install/callback?code=test-code&state=valid-state",
        {
          method: "GET",
          headers: {
            Cookie: `session=${sessionToken}; slack_install_state=valid-state`,
          },
        },
      );

      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("installed=1");
      expect(location).toContain("team=Test+Team");
      expect(location).toContain("/onboarding/connect-slack");
    });

    it("should redirect with error when installation fails", async () => {
      const { user } = await createTestUserAndWorkspace();
      // Mark user as onboarded
      const onboardingCompletedAt = new Date();
      await db
        .update(users)
        .set({ onboardingCompletedAt })
        .where(eq(users.id, user.id));

      validateSessionToken.mockResolvedValueOnce({
        user: { ...user, onboardingCompletedAt },
      });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      installWorkspace.mockResolvedValueOnce({
        success: false,
        error: "invalid_code",
      });

      const res = await app.request(
        "/install/callback?code=test-code&state=valid-state",
        {
          method: "GET",
          headers: {
            Cookie: `session=${sessionToken}; slack_install_state=valid-state`,
          },
        },
      );

      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("error=invalid_code");
      expect(location).toContain("/settings");

      // Check state cookie is still cleared even on error
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("slack_install_state=");
      expect(setCookieHeader).toContain("Max-Age=0");
    });

    it("should redirect to onboarding when user is not onboarded and installation fails", async () => {
      const { user } = await createTestUserAndWorkspace();
      // Update user to mark as not onboarded
      await db
        .update(users)
        .set({ onboardingCompletedAt: null })
        .where(eq(users.id, user.id));

      validateSessionToken.mockResolvedValueOnce({ user });

      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      installWorkspace.mockResolvedValueOnce({
        success: false,
        error: "api_error",
      });

      const res = await app.request(
        "/install/callback?code=test-code&state=valid-state",
        {
          method: "GET",
          headers: {
            Cookie: `session=${sessionToken}; slack_install_state=valid-state`,
          },
        },
      );

      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("error=api_error");
      expect(location).toContain("/onboarding/connect-slack");
    });
  });
});
