import { describe, it, expect, beforeEach, vi } from "vitest";
import { setup } from "../../../tests/vitest.helper";
import app from "@/handlers/api/oauth";
import * as schema from "@/db/schema";
import { uuidv7 } from "uuidv7";
import { encodeBase64urlNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { eq } from "drizzle-orm";

const { db, createTestUserAndWorkspace } = await setup();

describe("api/oauth", () => {
  // Suppress console output during tests
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("POST /register", () => {
    it("should register a new client successfully", async () => {
      const res = await app.request("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: "Test Client",
          redirect_uris: ["https://example.com/callback"],
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("client_id");
      expect(json).toHaveProperty("client_secret");
      expect(json).toHaveProperty("redirect_uris");
      expect(json.redirect_uris).toEqual(["https://example.com/callback"]);

      // Verify client was created in DB
      const clients = await db.query.clients.findMany({
        where: (t, { eq }) => eq(t.clientId, json.client_id),
      });
      expect(clients).toHaveLength(1);
      expect(clients[0].name).toBe("Test Client");
    });

    it("should register a client with multiple redirect URIs", async () => {
      const res = await app.request("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: "Multi URI Client",
          redirect_uris: [
            "https://example.com/callback",
            "https://app.example.com/oauth",
          ],
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.redirect_uris).toHaveLength(2);
    });

    it("should fail with empty client_name", async () => {
      const res = await app.request("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: "",
          redirect_uris: ["https://example.com/callback"],
        }),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with invalid redirect_uri", async () => {
      const res = await app.request("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: "Test Client",
          redirect_uris: ["not-a-valid-url"],
        }),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with empty redirect_uris array", async () => {
      const res = await app.request("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: "Test Client",
          redirect_uris: [],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /token (authorization_code)", () => {
    let testClient: typeof schema.clients.$inferSelect;
    let testUser: typeof schema.users.$inferSelect;
    let testWorkspace: typeof schema.workspaces.$inferSelect;
    let authCode: string;

    beforeEach(async () => {
      // Create test user and workspace
      const { user, workspace } = await createTestUserAndWorkspace();
      testUser = user;
      testWorkspace = workspace;

      // Create test client
      const [client] = await db
        .insert(schema.clients)
        .values({
          id: uuidv7(),
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          name: "Test Client",
          redirectUris: ["https://example.com/callback"],
        })
        .returning();
      testClient = client;

      // Create auth code
      authCode = "test-auth-code-" + uuidv7();
      await db.insert(schema.authCodes).values({
        id: uuidv7(),
        code: authCode,
        clientId: testClient.id,
        userId: testUser.id,
        workspaceId: testWorkspace.id,
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });
    });

    it("should exchange authorization code for tokens successfully", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          redirect_uri: "https://example.com/callback",
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({
        token_type: "Bearer",
        expires_in: 3600,
      });
      expect(json).toHaveProperty("access_token");
      expect(json).toHaveProperty("refresh_token");

      // Verify auth code was deleted
      const authCodes = await db.query.authCodes.findMany({
        where: (t, { eq }) => eq(t.code, authCode),
      });
      expect(authCodes).toHaveLength(0);

      // Verify access token was created
      const accessTokenHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(json.access_token)),
      );
      const accessTokens = await db.query.accessTokens.findMany({
        where: (t, { eq }) => eq(t.tokenHash, accessTokenHash),
      });
      expect(accessTokens).toHaveLength(1);

      // Verify refresh token was created
      const refreshTokenHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(json.refresh_token)),
      );
      const refreshTokens = await db.query.refreshTokens.findMany({
        where: (t, { eq }) => eq(t.tokenHash, refreshTokenHash),
      });
      expect(refreshTokens).toHaveLength(1);
    });

    it("should support PKCE with S256", async () => {
      const codeVerifier = "test-code-verifier-1234567890";
      const codeChallenge = encodeBase64urlNoPadding(
        sha256(new TextEncoder().encode(codeVerifier)),
      );

      // Update auth code with PKCE
      await db
        .update(schema.authCodes)
        .set({
          codeChallenge,
          codeChallengeMethod: "S256",
        })
        .where(eq(schema.authCodes.code, authCode));

      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          redirect_uri: "https://example.com/callback",
          client_id: testClient.clientId,
          code_verifier: codeVerifier,
        }).toString(),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("access_token");
    });

    it("should fail with invalid client_id", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          redirect_uri: "https://example.com/callback",
          client_id: "invalid-client-id",
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(401);
    });

    it("should fail with invalid code", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "invalid-code",
          redirect_uri: "https://example.com/callback",
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with mismatched redirect_uri", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          redirect_uri: "https://malicious.com/callback",
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with invalid client_secret", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          redirect_uri: "https://example.com/callback",
          client_id: testClient.clientId,
          client_secret: "wrong-secret",
        }).toString(),
      });

      expect(res.status).toBe(401);
    });

    it("should fail with expired auth code", async () => {
      // Update auth code to be expired
      await db
        .update(schema.authCodes)
        .set({
          expiresAt: new Date(Date.now() - 1000),
        })
        .where(eq(schema.authCodes.code, authCode));

      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          redirect_uri: "https://example.com/callback",
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with invalid PKCE code_verifier", async () => {
      const codeChallenge = encodeBase64urlNoPadding(
        sha256(new TextEncoder().encode("correct-verifier")),
      );

      await db
        .update(schema.authCodes)
        .set({
          codeChallenge,
          codeChallengeMethod: "S256",
        })
        .where(eq(schema.authCodes.code, authCode));

      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          redirect_uri: "https://example.com/callback",
          client_id: testClient.clientId,
          code_verifier: "wrong-verifier",
        }).toString(),
      });

      expect(res.status).toBe(400);
    });

    it("should fail when PKCE is required but code_verifier is missing", async () => {
      const codeChallenge = encodeBase64urlNoPadding(
        sha256(new TextEncoder().encode("test-verifier")),
      );

      await db
        .update(schema.authCodes)
        .set({
          codeChallenge,
          codeChallengeMethod: "S256",
        })
        .where(eq(schema.authCodes.code, authCode));

      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          redirect_uri: "https://example.com/callback",
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /token (refresh_token)", () => {
    let testClient: typeof schema.clients.$inferSelect;
    let testUser: typeof schema.users.$inferSelect;
    let testWorkspace: typeof schema.workspaces.$inferSelect;
    let accessToken: typeof schema.accessTokens.$inferSelect;
    let refreshToken: string;
    let refreshTokenRecord: typeof schema.refreshTokens.$inferSelect;

    beforeEach(async () => {
      // Create test user and workspace
      const { user, workspace } = await createTestUserAndWorkspace();
      testUser = user;
      testWorkspace = workspace;

      // Create test client
      const [client] = await db
        .insert(schema.clients)
        .values({
          id: uuidv7(),
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          name: "Test Client",
          redirectUris: ["https://example.com/callback"],
        })
        .returning();
      testClient = client;

      // Create access token
      const [token] = await db
        .insert(schema.accessTokens)
        .values({
          id: uuidv7(),
          tokenHash: "test-access-token-hash",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          clientId: testClient.id,
          userId: testUser.id,
          workspaceId: testWorkspace.id,
        })
        .returning();
      accessToken = token;

      // Create refresh token
      refreshToken = "test-refresh-token-" + uuidv7();
      const refreshTokenHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(refreshToken)),
      );
      const [createdRefreshToken] = await db
        .insert(schema.refreshTokens)
        .values({
          id: uuidv7(),
          tokenHash: refreshTokenHash,
          accessTokenId: accessToken.id,
          clientId: testClient.id,
          userId: testUser.id,
          workspaceId: testWorkspace.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .returning();
      refreshTokenRecord = createdRefreshToken;
    });

    it("should refresh tokens successfully", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({
        token_type: "Bearer",
        expires_in: 3600,
      });
      expect(json).toHaveProperty("access_token");
      expect(json).toHaveProperty("refresh_token");
      expect(json.access_token).not.toBe(refreshToken);
      expect(json.refresh_token).not.toBe(refreshToken);

      // Verify old access token was deleted
      const oldAccessTokens = await db.query.accessTokens.findMany({
        where: (t, { eq }) => eq(t.id, accessToken.id),
      });
      expect(oldAccessTokens).toHaveLength(0);

      // CRITICAL: Verify old refresh token was marked as used (not deleted)
      // This is important for security - we need to detect token replay attacks
      const [oldRefreshToken] = await db
        .select()
        .from(schema.refreshTokens)
        .where(eq(schema.refreshTokens.id, refreshTokenRecord.id));

      expect(oldRefreshToken).toBeDefined();
      expect(oldRefreshToken.usedAt).not.toBeNull();
      expect(oldRefreshToken.usedAt).toBeInstanceOf(Date);
      // Verify accessTokenId was set to null (because old access token was deleted)
      expect(oldRefreshToken.accessTokenId).toBeNull();

      // Verify new access token was created
      const newAccessTokenHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(json.access_token)),
      );
      const newAccessTokens = await db.query.accessTokens.findMany({
        where: (t, { eq }) => eq(t.tokenHash, newAccessTokenHash),
      });
      expect(newAccessTokens).toHaveLength(1);

      // Verify new refresh token was created
      const newRefreshTokenHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(json.refresh_token)),
      );
      const newRefreshTokens = await db.query.refreshTokens.findMany({
        where: (t, { eq }) => eq(t.tokenHash, newRefreshTokenHash),
      });
      expect(newRefreshTokens).toHaveLength(1);
    });

    it("should refresh tokens without client_secret for public clients", async () => {
      // Update client to have no secret (public client)
      await db
        .update(schema.clients)
        .set({ clientSecret: null })
        .where(eq(schema.clients.id, testClient.id));

      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("access_token");
    });

    it("should fail with invalid refresh_token", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: "invalid-refresh-token",
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(400);
    });

    it("should fail when refresh_token is already used (replay attack)", async () => {
      // Mark refresh token as used
      const refreshTokenHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(refreshToken)),
      );
      await db
        .update(schema.refreshTokens)
        .set({ usedAt: new Date() })
        .where(eq(schema.refreshTokens.tokenHash, refreshTokenHash));

      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with expired refresh_token", async () => {
      // Update refresh token to be expired
      const refreshTokenHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(refreshToken)),
      );
      await db
        .update(schema.refreshTokens)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(schema.refreshTokens.tokenHash, refreshTokenHash));

      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: testClient.clientId,
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with mismatched client_id", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: "different-client-id",
          client_secret: "test-client-secret",
        }).toString(),
      });

      expect(res.status).toBe(401);
    });

    it("should fail with invalid client_secret", async () => {
      const res = await app.request("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: testClient.clientId,
          client_secret: "wrong-secret",
        }).toString(),
      });

      expect(res.status).toBe(401);
    });
  });
});
