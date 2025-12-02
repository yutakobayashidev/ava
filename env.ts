import { loadEnvConfig } from "@next/env";
import { z } from "zod";

const staticEnv = z.object({
  NODE_ENV: z
    .union([
      z.literal("development"),
      z.literal("test"),
      z.literal("production"),
    ])
    .default("development"),

  // for client and server
  NEXT_PUBLIC_BASE_URL: z.url(),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1),

  // for server
  DATABASE_URL: z.url(),
  SLACK_APP_CLIENT_ID: z.string().min(1),
  SLACK_APP_CLIENT_SECRET: z.string().min(1),
  SLACK_SIGNING_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
});

const runtimeEnv = z.object({});

export type Schema = z.infer<typeof schema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const schema = z.intersection(staticEnv, runtimeEnv);

export function config(kind: "static" | "runtime" = "static") {
  const { combinedEnv } = loadEnvConfig(process.cwd());
  const res =
    kind === "static"
      ? staticEnv.safeParse(combinedEnv)
      : runtimeEnv.safeParse(combinedEnv);

  if (res.error) {
    console.error("\x1b[31m%s\x1b[0m", "[Errors] environment variables");
    console.error(JSON.stringify(res.error.issues, null, 2));
    process.exit(1);
  }
}
