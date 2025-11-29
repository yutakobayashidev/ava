import type { Env } from "@/app/create-app";
import { createMiddleware } from "hono/factory";

// Slack の Slash Command リクエストのペイロード
export interface SlackSlashCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  is_enterprise_install: string;
  response_url: string;
  trigger_id: string;
}

// ミドルウェア内部で受け渡されるコンテキスト
export interface SlackContext {
  payload: SlackSlashCommandPayload;
  verified: boolean;
}

/**
 * Slack リクエスト署名検証
 * 参考: https://api.slack.com/authentication/verifying-requests-from-slack
 */
export const verifySlackSignature = createMiddleware<Env>(async (c, next) => {
  const signature = c.req.header("x-slack-signature");
  const timestamp = c.req.header("x-slack-request-timestamp");

  if (!signature || !timestamp) {
    return c.json({ error: "Missing Slack signature headers" }, 401);
  }

  // リプレイ攻撃防止（リクエストは 5 分以内であること）
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    return c.json({ error: "Request timestamp too old" }, 401);
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  // リクエストボディをテキストとして取得（クローンして元のリクエストは保持）
  const body = await c.req.raw.clone().text();

  // シグネチャ計算用の文字列
  const sigBaseString = `v0:${timestamp}:${body}`;

  // HMAC SHA256 を計算
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(sigBaseString),
  );
  const computedSignature =
    "v0=" +
    Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  // タイミング攻撃対策ありの比較
  if (computedSignature !== signature) {
    console.error("Invalid Slack signature");
    return c.json({ error: "Invalid signature" }, 401);
  }

  await next();
});
