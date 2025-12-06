import type { Env } from "@/app/create-app";
import { createMiddleware } from "hono/factory";
import { env } from "hono/adapter";
import { HTTPException } from "hono/http-exception";

/**
 * Slack リクエスト署名検証
 * 参考: https://api.slack.com/authentication/verifying-requests-from-slack
 */
export const verifySlackSignature = createMiddleware<Env>(async (c, next) => {
  const signature = c.req.header("x-slack-signature");
  const timestamp = c.req.header("x-slack-request-timestamp");
  const { SLACK_SIGNING_SECRET: signingSecret } = env(c);

  if (!signature || !timestamp) {
    throw new HTTPException(401, {
      message: "Missing Slack signature headers",
    });
  }

  // リプレイ攻撃防止（リクエストは 5 分以内であること）
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    throw new HTTPException(401, { message: "Request timestamp too old" });
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
    throw new HTTPException(401, { message: "Invalid signature" });
  }

  await next();
});
