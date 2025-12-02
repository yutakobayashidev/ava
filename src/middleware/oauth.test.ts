import { describe, it, expect, beforeEach, vi } from "vitest";
import { setup } from "../../tests/vitest.helper";
import { createHonoApp } from "@/app/create-app";
import { oauthMiddleware } from "./oauth";
import * as schema from "@/db/schema";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";

const { db } = await setup();

describe("oauthMiddleware", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should reject request without Authorization header", async () => {
    const app = createHonoApp();
    app.get("/test", oauthMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/test", {
      method: "GET",
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(res.headers.get("WWW-Authenticate")).toMatch(
      /^Bearer resource_metadata=".+"$/,
    );
    expect(res.headers.get("WWW-Authenticate")).toContain(
      "/.well-known/oauth-protected-resource",
    );
  });

  it("should reject request with invalid Authorization header format", async () => {
    const app = createHonoApp();
    app.get("/test", oauthMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Authorization: "InvalidFormat token123",
      },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(res.headers.get("WWW-Authenticate")).toMatch(
      /^Bearer resource_metadata=".+"$/,
    );
  });

  it("should reject request with non-existent token", async () => {
    const app = createHonoApp();
    app.get("/test", oauthMiddleware, (c) => c.json({ success: true }));

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Authorization: "Bearer non_existent_token",
      },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(res.headers.get("WWW-Authenticate")).toMatch(
      /^Bearer resource_metadata=".+"$/,
    );
  });

  it("should reject request with expired token", async () => {
    const app = createHonoApp();
    app.get("/test", oauthMiddleware, (c) => c.json({ success: true }));

    // Create test data
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        id: "workspace-1",
        provider: "slack",
        externalId: "T123",
        name: "Test Team",
      })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        id: "user-1",
        slackId: "U123",
        slackTeamId: "T123",
        workspaceId: workspace.id,
      })
      .returning();

    const [client] = await db
      .insert(schema.clients)
      .values({
        id: "client-1",
        clientId: "test-client",
        name: "Test Client",
        redirectUris: ["https://example.com/callback"],
      })
      .returning();

    const token = "test_expired_token";
    const tokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );

    // Create expired access token
    await db.insert(schema.accessTokens).values({
      id: "token-1",
      tokenHash,
      clientId: client.id,
      userId: user.id,
      workspaceId: workspace.id,
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(res.headers.get("WWW-Authenticate")).toMatch(
      /^Bearer resource_metadata=".+"$/,
    );
  });

  it("should accept request with valid token", async () => {
    const app = createHonoApp();
    app.get("/test", oauthMiddleware, (c) => {
      const user = c.get("user");
      const workspace = c.get("workspace");
      return c.json({
        success: true,
        userId: user.id,
        workspaceId: workspace.id,
      });
    });

    // Create test data
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        id: "workspace-2",
        provider: "slack",
        externalId: "T456",
        name: "Test Team",
      })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        id: "user-2",
        slackId: "U456",
        slackTeamId: "T456",
        workspaceId: workspace.id,
      })
      .returning();

    const [client] = await db
      .insert(schema.clients)
      .values({
        id: "client-2",
        clientId: "test-client-2",
        name: "Test Client 2",
        redirectUris: ["https://example.com/callback"],
      })
      .returning();

    const token = "test_valid_token";
    const tokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );

    // Create valid access token
    await db.insert(schema.accessTokens).values({
      id: "token-2",
      tokenHash,
      clientId: client.id,
      userId: user.id,
      workspaceId: workspace.id,
      expiresAt: new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.userId).toBe(user.id);
    expect(json.workspaceId).toBe(workspace.id);
  });

  it("should reject token with mismatched workspace", async () => {
    const app = createHonoApp();
    app.get("/test", oauthMiddleware, (c) => c.json({ success: true }));

    // Create test data
    const [workspace1] = await db
      .insert(schema.workspaces)
      .values({
        id: "workspace-3",
        provider: "slack",
        externalId: "T789",
        name: "Test Team 1",
      })
      .returning();

    const [workspace2] = await db
      .insert(schema.workspaces)
      .values({
        id: "workspace-4",
        provider: "slack",
        externalId: "T012",
        name: "Test Team 2",
      })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        id: "user-3",
        slackId: "U789",
        slackTeamId: "T789",
        workspaceId: workspace1.id,
      })
      .returning();

    const [client] = await db
      .insert(schema.clients)
      .values({
        id: "client-3",
        clientId: "test-client-3",
        name: "Test Client 3",
        redirectUris: ["https://example.com/callback"],
      })
      .returning();

    const token = "test_mismatched_token";
    const tokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );

    // Create access token with different workspace
    await db.insert(schema.accessTokens).values({
      id: "token-3",
      tokenHash,
      clientId: client.id,
      userId: user.id,
      workspaceId: workspace2.id, // Different workspace
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(res.headers.get("WWW-Authenticate")).toMatch(
      /^Bearer resource_metadata=".+"$/,
    );
  });
});
