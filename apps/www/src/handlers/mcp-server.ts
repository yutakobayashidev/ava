import { Context } from "@/types";
import {
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
  CompleteTaskRequestSchema,
  ListTasksRequestSchema,
  PauseTaskRequestSchema,
  ReportBlockedRequestSchema,
  ResolveBlockedRequestSchema,
  ResumeTaskRequestSchema,
  StartTaskRequestSchema,
  UpdateTaskRequestSchema,
  convertResultToMcpResponse,
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
      inputSchema: StartTaskRequestSchema,
    },
    async (params) => {
      const command = {
        kind: "CreateTaskSessionCommand" as const,
        input: {
          workspace: ctx.get("workspace"),
          user: ctx.get("user"),
          ...params,
        },
      };
      const result = await constructStartTaskWorkflow(ctx)(command);
      return {
        content: [
          {
            type: "text",
            text: convertResultToMcpResponse(
              result,
              "タスクの追跡を開始しました。",
            ),
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
      inputSchema: UpdateTaskRequestSchema,
    },
    async (params) => {
      const command = {
        kind: "UpdateTaskSessionCommand" as const,
        input: {
          workspace: ctx.get("workspace"),
          user: ctx.get("user"),
          ...params,
        },
      };
      const result = await constructUpdateTaskWorkflow(ctx)(command);
      return {
        content: [
          {
            type: "text",
            text: convertResultToMcpResponse(result, "進捗を保存しました。"),
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
      inputSchema: ReportBlockedRequestSchema,
    },
    async (params) => {
      const command = {
        kind: "ReportBlockedCommand" as const,
        input: {
          workspace: ctx.get("workspace"),
          user: ctx.get("user"),
          ...params,
        },
      };
      const result = await constructReportBlockedWorkflow(ctx)(command);
      return {
        content: [
          {
            type: "text",
            text: convertResultToMcpResponse(
              result,
              "ブロッキング情報を登録しました。",
            ),
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
      inputSchema: PauseTaskRequestSchema,
    },
    async (params) => {
      const command = {
        kind: "PauseTaskCommand" as const,
        input: {
          workspace: ctx.get("workspace"),
          user: ctx.get("user"),
          ...params,
        },
      };
      const result = await constructPauseTaskWorkflow(ctx)(command);
      return {
        content: [
          {
            type: "text",
            text: convertResultToMcpResponse(
              result,
              "タスクを一時休止しました。",
            ),
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
      inputSchema: ResumeTaskRequestSchema,
    },
    async (params) => {
      const command = {
        kind: "ResumeTaskCommand" as const,
        input: {
          workspace: ctx.get("workspace"),
          user: ctx.get("user"),
          ...params,
        },
      };
      const result = await constructResumeTaskWorkflow(ctx)(command);
      return {
        content: [
          {
            type: "text",
            text: convertResultToMcpResponse(result, "タスクを再開しました。"),
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
      inputSchema: CompleteTaskRequestSchema,
    },
    async (params) => {
      const command = {
        kind: "CompleteTaskSessionCommand" as const,
        input: {
          workspace: ctx.get("workspace"),
          user: ctx.get("user"),
          ...params,
        },
      };
      const result = await constructCompleteTaskWorkflow(ctx)(command);
      return {
        content: [
          {
            type: "text",
            text: result.match(
              (completed) => {
                const hasUnresolvedBlocks =
                  completed.result.unresolvedBlocks &&
                  completed.result.unresolvedBlocks.length > 0;
                const message = hasUnresolvedBlocks
                  ? "完了報告を保存しました。未解決のブロッキングがあります。resolveBlockedツールで解決を報告してください。"
                  : "完了報告を保存しました。";
                return convertResultToMcpResponse(result, message);
              },
              () => convertResultToMcpResponse(result),
            ),
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
      inputSchema: ResolveBlockedRequestSchema,
    },
    async (params) => {
      const command = {
        kind: "ResolveBlockedCommand" as const,
        input: {
          workspace: ctx.get("workspace"),
          user: ctx.get("user"),
          ...params,
        },
      };
      const result = await constructResolveBlockedWorkflow(ctx)(command);
      return {
        content: [
          {
            type: "text",
            text: convertResultToMcpResponse(
              result,
              "ブロッキングの解決を報告しました。",
            ),
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
      inputSchema: ListTasksRequestSchema,
    },
    async (params) => {
      const command = {
        kind: "ListTaskSessionsCommand" as const,
        input: {
          workspace: ctx.get("workspace"),
          user: ctx.get("user"),
          ...params,
        },
      };
      const result = await constructListTasksWorkflow(ctx)(command);
      return {
        content: [
          {
            type: "text",
            text: convertResultToMcpResponse(result),
          },
        ],
      };
    },
  );

  return server;
}
