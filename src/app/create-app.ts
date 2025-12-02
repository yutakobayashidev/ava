import { Database, db } from "@/clients/drizzle";
import { createFactory } from "hono/factory";
import type { Context } from "hono";
import * as schema from "@/db/schema";
import { Schema } from "../../env";
import { AiSdkModels, createAiSdkModels } from "@/lib/ai";
import { env } from "hono/adapter";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import Stripe from "stripe";

export type Env = {
  Bindings: Schema;
  Variables: {
    db: Database;
    user: schema.User;
    workspace: schema.Workspace;
    ai: AiSdkModels;
    stripe: Stripe;
  };
};

/**
 * Honoのコンテキストから Env["Variables"] 形式のctxを取得するヘルパー
 *
 * Usecaseに渡すコンテキストを一箇所で定義することで、
 * コードの重複を避け、型安全性を保つ。
 *
 * @example
 * ```ts
 * app.get("/", async (c) => {
 *   const result = await someUsecase(params, getUsecaseContext(c));
 *   return c.json(result);
 * });
 * ```
 */
export const getUsecaseContext = (c: Context<Env>): Env["Variables"] => ({
  db: c.get("db"),
  user: c.get("user"),
  workspace: c.get("workspace"),
  ai: c.get("ai"),
  stripe: c.get("stripe"),
});

export const createHonoApp = () =>
  createFactory<Env>({
    initApp: (app) => {
      app.use(async (c, next) => {
        c.set("db", db);
        c.set(
          "ai",
          createAiSdkModels({
            env: {
              OPENAI_API_KEY: env(c).OPENAI_API_KEY,
            },
          }),
        );

        const { STRIPE_SECRET_KEY } = env(c);
        c.set(
          "stripe",
          new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: "2025-11-17.clover",
          }),
        );

        await next();
      });
    },
  })
    .createApp()
    .use(secureHeaders())
    .onError((error, c) => {
      if (error instanceof HTTPException) {
        console.error(error.cause);
        return c.json({ error: error.message }, error.status);
      }

      return c.json({ error: "Internal Server Error" }, 500);
    });
