import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import type { Env } from "@/app/create-app";
import * as taskSessionUsecases from "@/usecases/taskSessions";

export function createMcpServer(ctx: Env["Variables"]) {
  const server = new McpServer({
    name: "ava-mcp",
    version: "1.0.0",
  });

  const toTextResponse = (text: string) => ({
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  });

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

  server.registerTool(
    "start_task",
    {
      title: "start_task",
      description: "開始サマリをSlackに共有するための入力仕様。",
      inputSchema: z.object({
        issue: issueSchema,
        initial_summary: z
          .string()
          .min(1, "初期サマリは必須です")
          .describe("着手時点の抽象的な状況や方針"),
      }),
    },
    async ({ issue, initial_summary }) => {
      const result = await taskSessionUsecases.startTasks(
        { issue, initial_summary },
        ctx,
      );
      return toTextResponse(result.success ? result.data : result.error);
    },
  );

  server.registerTool(
    "update_task",
    {
      title: "update_task",
      description: "進捗の抽象的サマリを共有するための入力仕様。",
      inputSchema: z.object({
        task_session_id: z
          .string()
          .min(1, "task_session_idは必須です")
          .describe("start_taskで払い出されたタスクID"),
        summary: z
          .string()
          .min(1, "summaryは必須です")
          .describe("進捗の抽象的説明"),
        raw_context: rawContextSchema,
      }),
    },
    async ({ task_session_id, summary, raw_context }) => {
      const result = await taskSessionUsecases.updateTask(
        { task_session_id, summary, raw_context },
        ctx,
      );
      return toTextResponse(result.success ? result.data : result.error);
    },
  );

  server.registerTool(
    "report_blocked",
    {
      title: "report_blocked",
      description: "詰まり情報を共有するための入力仕様。",
      inputSchema: z.object({
        task_session_id: z
          .string()
          .min(1, "task_session_idは必須です")
          .describe("start_taskで払い出されたタスクID"),
        reason: z
          .string()
          .min(1, "reasonは必須です")
          .describe("詰まっている理由の要約"),
        raw_context: rawContextSchema,
      }),
    },
    async ({ task_session_id, reason, raw_context }) => {
      const result = await taskSessionUsecases.reportBlocked(
        { task_session_id, reason, raw_context },
        ctx,
      );
      return toTextResponse(result.success ? result.data : result.error);
    },
  );

  server.registerTool(
    "pause_task",
    {
      title: "pause_task",
      description: "タスクを一時休止するための入力仕様。",
      inputSchema: z.object({
        task_session_id: z
          .string()
          .min(1, "task_session_idは必須です")
          .describe("start_taskで払い出されたタスクID"),
        reason: z
          .string()
          .min(1, "reasonは必須です")
          .describe("休止理由の要約"),
        raw_context: rawContextSchema,
      }),
    },
    async ({ task_session_id, reason, raw_context }) => {
      const result = await taskSessionUsecases.pauseTask(
        { task_session_id, reason, raw_context },
        ctx,
      );
      return toTextResponse(result.success ? result.data : result.error);
    },
  );

  server.registerTool(
    "resume_task",
    {
      title: "resume_task",
      description: "一時休止したタスクを再開するための入力仕様。",
      inputSchema: z.object({
        task_session_id: z
          .string()
          .min(1, "task_session_idは必須です")
          .describe("start_taskで払い出されたタスクID"),
        summary: z
          .string()
          .min(1, "summaryは必須です")
          .describe("再開時のコメント"),
        raw_context: rawContextSchema,
      }),
    },
    async ({ task_session_id, summary, raw_context }) => {
      const result = await taskSessionUsecases.resumeTask(
        { task_session_id, summary, raw_context },
        ctx,
      );
      return toTextResponse(result.success ? result.data : result.error);
    },
  );

  server.registerTool(
    "complete_task",
    {
      title: "complete_task",
      description: "完了報告を共有するための入力仕様。",
      inputSchema: z.object({
        task_session_id: z
          .string()
          .min(1, "task_session_idは必須です")
          .describe("start_taskで払い出されたタスクID"),
        summary: z
          .string()
          .min(1, "summaryは必須です")
          .describe("完了内容の抽象的サマリ"),
      }),
    },
    async ({ task_session_id, summary }) => {
      const result = await taskSessionUsecases.completeTask(
        { task_session_id, summary },
        ctx,
      );
      return toTextResponse(result.success ? result.data : result.error);
    },
  );

  server.registerTool(
    "resolve_blocked",
    {
      title: "resolve_blocked",
      description: "ブロッキングが解決したことを報告する入力仕様。",
      inputSchema: z.object({
        task_session_id: z
          .string()
          .min(1, "task_session_idは必須です")
          .describe("start_taskで払い出されたタスクID"),
        block_report_id: z
          .string()
          .min(1, "block_report_idは必須です")
          .describe(
            "解決したブロッキングのID（complete_taskレスポンスやreport_blockedレスポンスから取得）",
          ),
      }),
    },
    async ({ task_session_id, block_report_id }) => {
      const result = await taskSessionUsecases.resolveBlocked(
        { task_session_id, block_report_id },
        ctx,
      );
      return toTextResponse(result.success ? result.data : result.error);
    },
  );

  server.registerTool(
    "list_tasks",
    {
      title: "list_tasks",
      description: "ユーザーのタスク一覧を取得する。",
      inputSchema: z.object({
        status: z
          .enum(["in_progress", "blocked", "paused", "completed"])
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
    async ({ status, limit }) => {
      const result = await taskSessionUsecases.listTasks(
        { status, limit },
        ctx,
      );
      return toTextResponse(result.success ? result.data : result.error);
    },
  );

  return server;
}
