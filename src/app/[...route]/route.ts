import { handle } from "hono/vercel";
import { StreamableHTTPTransport } from "@hono/mcp";
import { createMcpServer } from "../mcp";
import oauthRoutes from "../../routes/oauth";
import authRoutes from "../../routes/auth";
import slackRoutes from "../../routes/slack";
import healthRoutes from "../../routes/health";
import { oauthMiddleware } from "@/middleware/oauth";
import { createHonoApp } from "../create-app";

const app = createHonoApp();

app.route("/", oauthRoutes);
app.route("/login", authRoutes);
app.route("/slack", slackRoutes);
app.route("/api/health", healthRoutes);

app.all("/mcp", oauthMiddleware, async (c) => {
  const [user, workspace] = [c.get("user"), c.get("workspace")];
  const mcp = createMcpServer(user, workspace);
  const transport = new StreamableHTTPTransport();

  await mcp.connect(transport);

  return transport.handleRequest(c);
});

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
