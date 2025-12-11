import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderWidgetHtml } from "@apps-sdk/widget-runtime";
import { Hono } from "hono";
import type { Task } from "../types.js";
import { loadAssetMap } from "./assets.js";

const isViteDev =
  typeof import.meta !== "undefined"
    ? (import.meta as any).env?.DEV
    : undefined;
const isDev = isViteDev ?? process.env.NODE_ENV !== "production";

// Base URL for dev widget assets (set DEV_WIDGET_BASE_URL to your tunnel origin)
const devWidgetOrigin =
  process.env.DEV_WIDGET_BASE_URL ?? "https://apps-sdk-dev-3.tunnelto.dev";

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

async function renderWidget(widgetName: string): Promise<string> {
  // In dev mode, use relative path (Vite dev server handles it)
  if (devWidgetOrigin || isDev) {
    return renderWidgetHtml(widgetName, {
      scriptSrc: `/${widgetName}.js`,
    });
  }

  const assets = await loadAssetMap();
  return renderWidgetHtml(widgetName, assets[widgetName]);
}

function createTaskServer(): McpServer {
  const server = new McpServer({
    name: "ava-task-manager",
    version: "0.1.0",
  });

  // Register the task list widget resource
  server.registerResource(
    "task-list-widget",
    "ui://widget/task-list.html",
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
          text: await renderWidget("tasks"),
          _meta: {
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": "https://chatgpt.com",
            "openai/widgetCSP": {
              connect_domains: ["https://chatgpt.com", devWidgetOrigin],
              resource_domains: ["https://*.oaistatic.com", devWidgetOrigin],
            },
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
      annotations: {
        readOnlyHint: true,
      },
      _meta: {
        "openai/outputTemplate": "ui://widget/task-list.html",
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
          "openai/outputTemplate": "ui://widget/task-list.html",
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

export function createApp() {
  const app = new Hono();

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

  return app;
}

const app = createApp();
export default app;
