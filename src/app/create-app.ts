import { Database, db } from "@/clients/drizzle";
import { createFactory } from "hono/factory";
import type { Context } from "hono";
import * as schema from "@/db/schema";
import { Schema } from "../../env";
import { AiSdkModels, createAiSdkModels } from "@/lib/ai";

export type Env = {
  Bindings: Schema;
  Variables: {
    db: Database;
    user: schema.User;
    workspace: schema.Workspace;
    ai: AiSdkModels;
  };
};

/**
 * Honoのコンテキストから Env["Variables"] 形式のctxを取得するヘルパー
 */
export const getUsecaseContext = (c: Context<Env>): Env["Variables"] => ({
  db: c.get("db"),
  user: c.get("user"),
  workspace: c.get("workspace"),
  ai: c.get("ai"),
});

export const createHonoApp = () =>
  createFactory<Env>({
    initApp: (app) => {
      app.use(async (c, next) => {
        c.set("db", db);
        c.set("ai", createAiSdkModels(c));
        // TODO: AI SDK
        await next();
      });
    },
  }).createApp();
