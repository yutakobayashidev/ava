import { renderWidget } from "@/lib/widget-renderer";
import { Context } from "@/types";
import {
  constructCancelTaskWorkflow,
  constructCompleteTaskWorkflow,
  constructListTasksWorkflow,
  constructPauseTaskWorkflow,
  constructReportBlockedWorkflow,
  constructResolveBlockedWorkflow,
  constructResumeTaskWorkflow,
  constructStartTaskWorkflow,
  constructUpdateTaskWorkflow,
} from "@/usecases/taskSessions/constructor";
import {
  cancelTaskInputSchema,
  completeTaskInputSchema,
  formatErrorResponse,
  formatSuccessResponse,
  listTasksInputSchema,
  pauseTaskInputSchema,
  reportBlockedInputSchema,
  resolveBlockedInputSchema,
  resumeTaskInputSchema,
  startTaskInputSchema,
  updateTaskInputSchema,
} from "@/usecases/taskSessions/controller";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const devWidgetOrigin =
  process.env.DEV_WIDGET_BASE_URL ?? "https://apps-sdk-dev-3.tunnelto.dev";

export function createMcpServer(ctx: Context) {
  const server = new McpServer({
    name: "ava-mcp",
    version: "1.0.0",
  });

  // Register task list widget resource
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

  server.registerTool(
    "startTask",
    {
      title: "startTask",
      description: "開始サマリをSlackに共有するための入力仕様。",
      inputSchema: startTaskInputSchema,
    },
    (input) => {
      const result = constructStartTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        input,
      });
      return result.match(
        (data) => formatSuccessResponse(data, "タスクの追跡を開始しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "updateTask",
    {
      title: "updateTask",
      description: "進捗の抽象的サマリを共有するための入力仕様。",
      inputSchema: updateTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...commandInput } = input;
      const result = constructUpdateTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: {
          type: "AddProgress",
          input: commandInput,
        },
      });
      return result.match(
        (data) => formatSuccessResponse(data, "進捗を保存しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "reportBlocked",
    {
      title: "reportBlocked",
      description: "ブロッキング情報を共有するための入力仕様。",
      inputSchema: reportBlockedInputSchema,
    },
    (input) => {
      const { taskSessionId, ...commandInput } = input;
      const result = constructReportBlockedWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: {
          type: "ReportBlock",
          input: commandInput,
        },
      });
      return result.match(
        (data) =>
          formatSuccessResponse(data, "ブロッキング情報を登録しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "pauseTask",
    {
      title: "pauseTask",
      description: "タスクを一時休止するための入力仕様。",
      inputSchema: pauseTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...commandInput } = input;
      const result = constructPauseTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: {
          type: "PauseTask",
          input: commandInput,
        },
      });
      return result.match(
        (data) => formatSuccessResponse(data, "タスクを一時休止しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "resumeTask",
    {
      title: "resumeTask",
      description: "一時休止したタスクを再開するための入力仕様。",
      inputSchema: resumeTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...commandInput } = input;
      const result = constructResumeTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: {
          type: "ResumeTask",
          input: commandInput,
        },
      });
      return result.match(
        (data) => formatSuccessResponse(data, "タスクを再開しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "completeTask",
    {
      title: "completeTask",
      description: "完了報告を共有するための入力仕様。",
      inputSchema: completeTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...commandInput } = input;
      const result = constructCompleteTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: { type: "CompleteTask", input: commandInput },
      });
      return result.match(
        (data) =>
          formatSuccessResponse(
            data,
            data.unresolvedBlocks && data.unresolvedBlocks.length > 0
              ? "完了報告を保存しました。未解決のブロッキングがあります。resolveBlockedツールで解決を報告してください。"
              : "完了報告を保存しました。",
          ),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "cancelTask",
    {
      title: "cancelTask",
      description: "タスク中止を受け付けるための入力仕様。",
      inputSchema: cancelTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...commandInput } = input;
      const result = constructCancelTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: { type: "CancelTask", input: commandInput },
      });
      return result.match(
        (data) => formatSuccessResponse(data, "タスクを中止しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "resolveBlocked",
    {
      title: "resolveBlocked",
      description: "ブロッキングが解決したことを報告する入力仕様。",
      inputSchema: resolveBlockedInputSchema,
    },
    (input) => {
      const { taskSessionId, blockReportId } = input;
      const result = constructResolveBlockedWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: { type: "ResolveBlock", input: { blockId: blockReportId } },
      });
      return result.match(
        (data) =>
          formatSuccessResponse(data, "ブロッキングの解決を報告しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "listTasks",
    {
      title: "listTasks",
      description: "ユーザーのタスク一覧を取得する。",
      inputSchema: listTasksInputSchema,
      annotations: {
        readOnlyHint: true,
      },
      _meta: {
        "openai/outputTemplate": "ui://widget/task-list.html",
        "openai/toolInvocation/invoking": "タスク一覧を取得中…",
        "openai/toolInvocation/invoked": "タスク一覧を表示",
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
      },
    },
    (input) => {
      const result = constructListTasksWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        input,
      });
      return result.match(
        (data) => ({
          content: [
            {
              type: "text" as const,
              text: "タスク一覧を表示しました。",
            },
          ],
          structuredContent: data,
          _meta: {
            "openai/outputTemplate": "ui://widget/task-list.html",
            "openai/toolInvocation/invoking": "タスク一覧を取得中…",
            "openai/toolInvocation/invoked": "タスク一覧を表示",
            "openai/widgetAccessible": true,
            "openai/resultCanProduceWidget": true,
          },
        }),
        (error) => formatErrorResponse(error),
      );
    },
  );

  return server;
}
