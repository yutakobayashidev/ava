import { Database, db } from "@/clients/drizzle";
import { createFactory } from "hono/factory";
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
