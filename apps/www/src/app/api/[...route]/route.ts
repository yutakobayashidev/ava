import authRoutes from "@/handlers/api/auth";
import healthRoutes from "@/handlers/api/health";
import oauthRoutes from "@/handlers/api/oauth";
import slackRoutes from "@/handlers/api/slack";
import stripeRoutes from "@/handlers/api/stripe";
import { handle } from "hono/vercel";
import { createHonoApp } from "../../../create-app";

const app = createHonoApp().basePath("/api");

app.route("/oauth", oauthRoutes);
app.route("/auth", authRoutes);
app.route("/slack", slackRoutes);
app.route("/stripe", stripeRoutes);
app.route("/health", healthRoutes);

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
