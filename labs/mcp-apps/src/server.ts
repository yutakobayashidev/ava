import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolResult,
  isInitializeRequest,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import z from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist is one level above src
const distDir = path.join(__dirname, "..", "dist");

const loadHtml = async (name: string) => {
  const htmlPath = path.join(distDir, `${name}.html`);
  return fs.readFile(htmlPath, "utf-8");
};

const server = new McpServer({
  name: "example-server",
  version: "0.1.0",
});

server.registerResource(
  // リソース名
  "ui-react",
  // リソースのURI
  "ui://example/ui-react",
  {
    // 人間が読むためのタイトル
    title: "UI React Example",
    // MIMEタイプは必ず text/html+mcp
    mimeType: "text/html+mcp",
  },
  // UI リソースの内容を返す関数
  async (): Promise<ReadResourceResult> => {
    const contentUiReact = await loadHtml("ui-react");
    return {
      contents: [
        {
          uri: "ui://example/ui-react",
          text: contentUiReact,
          mimeType: "text/html+mcp",
        },
      ],
    };
  },
);

server.registerTool(
  "create-react-ui",
  {
    title: "Create React UI",
    description: "Returns a React-based UI",
    inputSchema: {},
    outputSchema: {
      message: z.string().describe("Message to display"),
    },
    // registerResourceで登録したUIリソースを返す
    _meta: {
      "ui/resourceUri": "ui://example/ui-react",
    },
  },
  // ツールの処理内容を実装する関数
  async (): Promise<CallToolResult> => {
    const message = "This is a React-based UI!";
    return {
      content: [{ type: "text", text: JSON.stringify({ message }) }],
      structuredContent: { message },
    };
  },
);

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id"],
  }),
);

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

const mcpPostHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (sessionId) => {
          console.log(`Session initialized: ${sessionId}`);
          transports[sessionId] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Session closed: ${sid}`);
          delete transports[sid];
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID" },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
};

app.post("/mcp", mcpPostHandler);

app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling session termination:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing session termination");
    }
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, () => {
  console.log(`MCP Server listening on http://localhost:${PORT}/mcp`);
});
