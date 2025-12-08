import { Context } from "@/types";
import {
  constructCompleteTaskWorkflow,
  constructListTasksWorkflow,
  constructCancelTaskWorkflow,
  constructPauseTaskWorkflow,
  constructReportBlockedWorkflow,
  constructResolveBlockedWorkflow,
  constructResumeTaskWorkflow,
  constructStartTaskWorkflow,
  constructUpdateTaskWorkflow,
} from "@/usecases/taskSessions/constructor";
import {
  completeTaskInputSchema,
  cancelTaskInputSchema,
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

export function createMcpServer(ctx: Context) {
  const server = new McpServer({
    name: "ava-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "startTask",
    {
      title: "startTask",
      description: "開始サマリをSlackに共有するための入力仕様。",
      inputSchema: startTaskInputSchema,
    },
    async (params) => {
      const result = await constructStartTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? formatSuccessResponse(
                  result.data,
                  "タスクの追跡を開始しました。",
                )
              : result.error,
          },
        ],
      };
    },
  );

  server.registerTool(
    "updateTask",
    {
      title: "updateTask",
      description: "進捗の抽象的サマリを共有するための入力仕様。",
      inputSchema: updateTaskInputSchema,
    },
    async (params) => {
      const result = await constructUpdateTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? formatSuccessResponse(result.data, "進捗を保存しました。")
              : result.error,
          },
        ],
      };
    },
  );

  server.registerTool(
    "reportBlocked",
    {
      title: "reportBlocked",
      description: "ブロッキング情報を共有するための入力仕様。",
      inputSchema: reportBlockedInputSchema,
    },
    async (params) => {
      const result = await constructReportBlockedWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? formatSuccessResponse(
                  result.data,
                  "ブロッキング情報を登録しました。",
                )
              : result.error,
          },
        ],
      };
    },
  );

  server.registerTool(
    "pauseTask",
    {
      title: "pauseTask",
      description: "タスクを一時休止するための入力仕様。",
      inputSchema: pauseTaskInputSchema,
    },
    async (params) => {
      const result = await constructPauseTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? formatSuccessResponse(result.data, "タスクを一時休止しました。")
              : result.error,
          },
        ],
      };
    },
  );

  server.registerTool(
    "resumeTask",
    {
      title: "resumeTask",
      description: "一時休止したタスクを再開するための入力仕様。",
      inputSchema: resumeTaskInputSchema,
    },
    async (params) => {
      const result = await constructResumeTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? formatSuccessResponse(result.data, "タスクを再開しました。")
              : result.error,
          },
        ],
      };
    },
  );

  server.registerTool(
    "completeTask",
    {
      title: "completeTask",
      description: "完了報告を共有するための入力仕様。",
      inputSchema: completeTaskInputSchema,
    },
    async (params) => {
      const result = await constructCompleteTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? formatSuccessResponse(
                  result.data,
                  result.data.unresolvedBlocks &&
                    result.data.unresolvedBlocks.length > 0
                    ? "完了報告を保存しました。未解決のブロッキングがあります。resolveBlockedツールで解決を報告してください。"
                    : "完了報告を保存しました。",
                )
              : result.error,
          },
        ],
      };
    },
  );

  server.registerTool(
    "cancelTask",
    {
      title: "cancelTask",
      description: "タスク中止を受け付けるための入力仕様。",
      inputSchema: cancelTaskInputSchema,
    },
    async (params) => {
      const result = await constructCancelTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? formatSuccessResponse(result.data, "タスクを中止しました。")
              : result.error,
          },
        ],
      };
    },
  );

  server.registerTool(
    "resolveBlocked",
    {
      title: "resolveBlocked",
      description: "ブロッキングが解決したことを報告する入力仕様。",
      inputSchema: resolveBlockedInputSchema,
    },
    async (params) => {
      const result = await constructResolveBlockedWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? formatSuccessResponse(
                  result.data,
                  "ブロッキングの解決を報告しました。",
                )
              : result.error,
          },
        ],
      };
    },
  );

  server.registerTool(
    "listTasks",
    {
      title: "listTasks",
      description: "ユーザーのタスク一覧を取得する。",
      inputSchema: listTasksInputSchema,
    },
    async (params) => {
      const result = await constructListTasksWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        params,
      });
      return {
        content: [
          {
            type: "text",
            text: result.success
              ? JSON.stringify(result.data, null, 2)
              : result.error,
          },
        ],
      };
    },
  );

  return server;
}
