import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHonoApp } from "@/app/create-app";
import { verifySlackSignature } from "./slack";

describe("verifySlackSignature", () => {
  const SIGNING_SECRET = "test_signing_secret";

  beforeEach(() => {
    vi.stubEnv("SLACK_SIGNING_SECRET", SIGNING_SECRET);
  });

  const createSignature = async (
    timestamp: string,
    body: string,
    secret: string,
  ) => {
    const sigBaseString = `v0:${timestamp}:${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(sigBaseString),
    );
    return (
      "v0=" +
      Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  };

  it("should accept valid signature", async () => {
    const app = createHonoApp();
    app.post("/commands", verifySlackSignature, (c) =>
      c.json({ success: true }),
    );

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = "token=test&team_id=T123&user_id=U123&channel_id=C123";
    const signature = await createSignature(timestamp, body, SIGNING_SECRET);

    const res = await app.request("/commands", {
      method: "POST",
      headers: {
        "x-slack-signature": signature,
        "x-slack-request-timestamp": timestamp,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("should reject missing signature header", async () => {
    const app = createHonoApp();
    app.post("/commands", verifySlackSignature, (c) =>
      c.json({ success: true }),
    );

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = "token=test&team_id=T123&user_id=U123&channel_id=C123";

    const res = await app.request("/commands", {
      method: "POST",
      headers: {
        "x-slack-request-timestamp": timestamp,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Missing Slack signature headers",
    });
  });

  it("should reject missing timestamp header", async () => {
    const app = createHonoApp();
    app.post("/commands", verifySlackSignature, (c) =>
      c.json({ success: true }),
    );

    const body = "token=test&team_id=T123&user_id=U123&channel_id=C123";

    const res = await app.request("/commands", {
      method: "POST",
      headers: {
        "x-slack-signature": "v0=invalid",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Missing Slack signature headers",
    });
  });

  it("should reject old timestamp (replay attack)", async () => {
    const app = createHonoApp();
    app.post("/commands", verifySlackSignature, (c) =>
      c.json({ success: true }),
    );

    // 6 minutes ago
    const timestamp = (Math.floor(Date.now() / 1000) - 60 * 6).toString();
    const body = "token=test&team_id=T123&user_id=U123&channel_id=C123";
    const signature = await createSignature(timestamp, body, SIGNING_SECRET);

    const res = await app.request("/commands", {
      method: "POST",
      headers: {
        "x-slack-signature": signature,
        "x-slack-request-timestamp": timestamp,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Request timestamp too old" });
  });

  it("should reject invalid signature", async () => {
    const app = createHonoApp();
    app.post("/commands", verifySlackSignature, (c) =>
      c.json({ success: true }),
    );

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = "token=test&team_id=T123&user_id=U123&channel_id=C123";
    const signature = "v0=invalid_signature";

    const res = await app.request("/commands", {
      method: "POST",
      headers: {
        "x-slack-signature": signature,
        "x-slack-request-timestamp": timestamp,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid signature" });
  });

  it("should allow body to be parsed after verification", async () => {
    const app = createHonoApp();
    app.post("/commands", verifySlackSignature, async (c) => {
      const body = await c.req.parseBody();
      return c.json({
        team_id: body.team_id,
        user_id: body.user_id,
        command: body.command,
      });
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body =
      "token=xoxb-test&team_id=T123456&team_domain=example&channel_id=C123456&channel_name=general&user_id=U123456&user_name=testuser&command=/daily-report&text=&api_app_id=A123456&is_enterprise_install=false&response_url=https://hooks.slack.com/test&trigger_id=123.456";
    const signature = await createSignature(timestamp, body, SIGNING_SECRET);

    const res = await app.request("/commands", {
      method: "POST",
      headers: {
        "x-slack-signature": signature,
        "x-slack-request-timestamp": timestamp,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result).toEqual({
      team_id: "T123456",
      user_id: "U123456",
      command: "/daily-report",
    });
  });
});
