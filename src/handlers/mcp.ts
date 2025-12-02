import { StreamableHTTPTransport } from "@hono/mcp";
import { createMcpServer } from "./mcp-server";
import { oauthMiddleware } from "@/middleware/oauth";
import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { cors } from "hono/cors";

export const mcpHandler = createHonoApp().basePath("/mcp");

mcpHandler.all(
  "/",
  cors({
    origin: "*",
    exposeHeaders: ["Mcp-Session-Id"],
    allowHeaders: ["Content-Type", "mcp-session-id", "mcp-protocol-version"],
  }),
  oauthMiddleware,
  async (c) => {
    const mcp = createMcpServer(getUsecaseContext(c));
    const transport = new StreamableHTTPTransport();

    await mcp.connect(transport);

    return transport.handleRequest(c);
  },
);
