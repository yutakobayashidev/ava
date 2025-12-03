import { handle } from "hono/vercel";
import oauthRoutes from "@/handlers/api/oauth";
import authRoutes from "@/handlers/api/auth";
import slackRoutes from "@/handlers/api/slack";
import googleDriveRoutes from "@/handlers/api/google-drive";
import healthRoutes from "@/handlers/api/health";
import stripeRoutes from "@/handlers/api/stripe";
import { createHonoApp } from "../../create-app";

const app = createHonoApp().basePath("/api");

app.route("/oauth", oauthRoutes);
app.route("/auth", authRoutes);
app.route("/slack", slackRoutes);
app.route("/google-drive", googleDriveRoutes);
app.route("/stripe", stripeRoutes);
app.route("/health", healthRoutes);

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
