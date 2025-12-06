import { createHonoApp } from "@/create-app";
import { oauthMiddleware } from "@/middleware/oauth";
import { StreamableHTTPTransport } from "@hono/mcp";
import { cors } from "hono/cors";
import { createMcpServer } from "./mcp-server";

export const mcpHandler = createHonoApp().basePath("/mcp");

mcpHandler.all(
  "/",
  cors({
    origin: "*",
    exposeHeaders: ["Mcp-Session-Id"],
    allowHeaders: [
      "Content-Type",
      "mcp-session-id",
      "mcp-protocol-version",
      "Authorization",
    ],
  }),
  oauthMiddleware,
  async (c) => {
    const mcp = createMcpServer(c);
    const transport = new StreamableHTTPTransport();

    await mcp.connect(transport);

    return transport.handleRequest(c);
  },
);
