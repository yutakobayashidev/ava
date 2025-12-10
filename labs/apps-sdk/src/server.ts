import "dotenv/config";
import { serve } from "@hono/node-server";
import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { loadAssetMap } from "./server/assets.js";
import { renderWidgetHtml } from "./server/widget.js";
import type { Task } from "./types.js";

// ダミーのタスクデータ
const getDummyTasks = (): Task[] => [
  {
    taskSessionId: "task-1",
    issueProvider: "github",
    issueId: "123",
    issueTitle: "Implement task list widget",
    status: "inProgress",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    taskSessionId: "task-2",
    issueProvider: "manual",
    issueId: null,
    issueTitle: "Fix asset loading in production",
    status: "completed",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    taskSessionId: "task-3",
    issueProvider: "github",
    issueId: "456",
    issueTitle: "Add MCP server endpoints",
    status: "paused",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

async function renderWidget(): Promise<string> {
  const assets = await loadAssetMap();
  return renderWidgetHtml(assets);
}

function createTaskServer(): McpServer {
  const server = new McpServer({
    name: "ava-task-manager",
    version: "0.1.0",
  });

  // Register the task list widget resource
  server.registerResource(
    "task-list-widget",
    "ui://widget/todo-list.html",
    {
      title: "Ava Task Manager Widget",
      description: "Interactive task list powered by hono/jsx",
      mimeType: "text/html+skybridge",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: await renderWidget(),
          _meta: {
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    }),
  );

  // Register task-list tool
  server.registerTool(
    "task-list",
    {
      title: "Show Task List",
      description: "Display the task list widget",
      inputSchema: {},
      _meta: {
        "openai/outputTemplate": "ui://widget/todo-list.html",
        "openai/toolInvocation/invoking": "Rendering task list…",
        "openai/toolInvocation/invoked": "Task list ready",
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
      },
    },
    async () => {
      const tasks = getDummyTasks();
      return {
        content: [
          {
            type: "text" as const,
            text: "Task list rendered.",
          },
        ],
        structuredContent: {
          tasks,
          total: tasks.length,
        },
        _meta: {
          "openai/outputTemplate": "ui://widget/todo-list.html",
          "openai/toolInvocation/invoking": "Rendering task list…",
          "openai/toolInvocation/invoked": "Task list ready",
          "openai/widgetAccessible": true,
          "openai/resultCanProduceWidget": true,
        },
      };
    },
  );

  return server;
}

const app = new Hono();

app.get("/", (c) =>
  c.json({
    status: "ok",
    message:
      "Ava Task Manager MCP server. Use /mcp to connect via Streamable HTTP transport.",
  }),
);

app.all("/mcp", async (c) => {
  const transport = new StreamableHTTPTransport();
  const server = createTaskServer();

  transport.onclose = async () => {
    await server.close();
  };

  try {
    await server.connect(transport);
  } catch (error) {
    console.error("Failed to start MCP session", error);
    return c.json({ error: "Failed to start MCP session" }, 500);
  }

  return transport.handleRequest(c);
});

// Start server if running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT) || 3000;
  console.log(`Starting Ava Task Manager MCP server on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  if (process.env.VITE_DEV_SERVER_ORIGIN) {
    console.log(`Vite dev server: ${process.env.VITE_DEV_SERVER_ORIGIN}`);
  }

  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`Server running at http://localhost:${port}`);
}

export default app;
