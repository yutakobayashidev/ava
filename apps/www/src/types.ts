import { AiSdkModels } from "@/lib/server/ai";
import { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { Context as HonoContext } from "hono";
import Stripe from "stripe";
import { Schema } from "../env";

export type HonoEnv = {
  Bindings: Schema;
  Variables: {
    db: Database;
    user: schema.User;
    workspace: schema.Workspace;
    ai: AiSdkModels;
    stripe: Stripe;
  };
};

export type Context = HonoContext<HonoEnv>;
