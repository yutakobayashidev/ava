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
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

// プレゼンテーション層: データオブジェクトをJSON文字列化してメッセージを追加
function formatSuccessResponse(data: object, message: string) {
  return JSON.stringify({ ...data, message }, null, 2);
}

const rawContextSchema = z
  .record(z.string(), z.unknown())
  .default({})
  .describe("Slackへ共有可能な抽象的メタデータ");

const issueSchema = z.object({
  provider: z.enum(["github", "manual"]).describe("課題の取得元"),
  id: z.string().trim().optional().describe("GitHub Issue番号などの識別子"),
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .describe("タスクの簡潔なタイトル"),
});

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
      inputSchema: z.object({
        issue: issueSchema,
        initialSummary: z
          .string()
          .min(1, "初期サマリは必須です")
          .describe("着手時点の抽象的な状況や方針"),
      }),
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
      inputSchema: z.object({
        taskSessionId: z
          .string()
          .min(1, "taskSessionIdは必須です")
          .describe("startTaskで払い出されたタスクID"),
        summary: z
          .string()
          .min(1, "summaryは必須です")
          .describe("進捗の抽象的説明"),
        rawContext: rawContextSchema,
      }),
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
      inputSchema: z.object({
        taskSessionId: z
          .string()
          .min(1, "taskSessionIdは必須です")
          .describe("startTaskで払い出されたタスクID"),
        reason: z
          .string()
          .min(1, "reasonは必須です")
          .describe("詰まっている理由の要約"),
        rawContext: rawContextSchema,
      }),
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
      inputSchema: z.object({
        taskSessionId: z
          .string()
          .min(1, "taskSessionIdは必須です")
          .describe("startTaskで払い出されたタスクID"),
        reason: z
          .string()
          .min(1, "reasonは必須です")
          .describe("休止理由の要約"),
        rawContext: rawContextSchema,
      }),
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
      inputSchema: z.object({
        taskSessionId: z
          .string()
          .min(1, "taskSessionIdは必須です")
          .describe("startTaskで払い出されたタスクID"),
        summary: z
          .string()
          .min(1, "summaryは必須です")
          .describe("再開時のコメント"),
        rawContext: rawContextSchema,
      }),
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
      inputSchema: z.object({
        taskSessionId: z
          .string()
          .min(1, "taskSessionIdは必須です")
          .describe("startTaskで払い出されたタスクID"),
        summary: z
          .string()
          .min(1, "summaryは必須です")
          .describe("完了内容の抽象的サマリ"),
      }),
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
    "resolveBlocked",
    {
      title: "resolveBlocked",
      description: "ブロッキングが解決したことを報告する入力仕様。",
      inputSchema: z.object({
        taskSessionId: z
          .string()
          .min(1, "taskSessionIdは必須です")
          .describe("startTaskで払い出されたタスクID"),
        blockReportId: z
          .string()
          .min(1, "blockReportIdは必須です")
          .describe(
            "解決したブロッキングのID（completeTaskレスポンスやreportBlockedレスポンスから取得）",
          ),
      }),
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
      inputSchema: z.object({
        status: z
          .enum(["inProgress", "blocked", "paused", "completed"])
          .optional()
          .describe("フィルタリングするステータス（省略時は全ステータス）"),
        limit: z
          .number()
          .positive()
          .max(100)
          .optional()
          .describe("取得する最大件数（デフォルト: 50）"),
      }),
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
