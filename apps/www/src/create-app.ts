import { db } from "@ava/database/client";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { env } from "hono/adapter";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import Stripe from "stripe";
import { createAiSdkModels } from "./lib/server/ai";
import { withTraceResponseHeader } from "./middleware/otel";
import { HonoEnv } from "./types";

const factory = () =>
  createFactory<HonoEnv>({
    initApp: (app) => {
      app.use(
        httpInstrumentationMiddleware({ serviceName: "ava" }),
        withTraceResponseHeader,
      );

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
  });

export const createHonoApp = () => {
  return factory()
    .createApp()
    .onError((error, c) => {
      if (error instanceof HTTPException) {
        console.error(error.cause);
        return error.res ?? c.json({ error: error.message }, error.status);
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });
};
