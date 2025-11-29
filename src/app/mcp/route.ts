import { handle } from "hono/vercel";
import { StreamableHTTPTransport } from "@hono/mcp";
import { createMcpServer } from "../mcp";
import { oauthMiddleware } from "@/middleware/oauth";
import { createHonoApp } from "../create-app";

const app = createHonoApp().basePath("/mcp");

app.all("/", oauthMiddleware, async (c) => {
  const [user, workspace] = [c.get("user"), c.get("workspace")];
  const mcp = createMcpServer(user, workspace);
  const transport = new StreamableHTTPTransport();

  await mcp.connect(transport);

  return transport.handleRequest(c);
});

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
