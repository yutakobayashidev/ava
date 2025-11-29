import { handle } from "hono/vercel";
import oauthRoutes from "@/routes/oauth";
import authRoutes from "@/routes/auth";
import slackRoutes from "@/routes/slack";
import healthRoutes from "@/routes/health";
import { createHonoApp } from "../../create-app";

const app = createHonoApp().basePath("/api");

app.route("/", oauthRoutes);
app.route("/login", authRoutes);
app.route("/slack", slackRoutes);
app.route("/health", healthRoutes);

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
