import { StreamableHTTPTransport } from "@hono/mcp";
import { createMcpServer } from "./mcp-server";
import { oauthMiddleware } from "@/middleware/oauth";
import { createHonoApp, getUsecaseContext } from "@/app/create-app";

export const mcpHandler = createHonoApp().basePath("/mcp");

mcpHandler.all("/", oauthMiddleware, async (c) => {
  const mcp = createMcpServer(getUsecaseContext(c));
  const transport = new StreamableHTTPTransport();

  await mcp.connect(transport);

  return transport.handleRequest(c);
});
