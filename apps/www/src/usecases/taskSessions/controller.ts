import { z } from "zod/v3";

const issueSchema = z.object({
  provider: z.enum(["github", "manual"]).describe("課題の取得元"),
  id: z.string().trim().optional().describe("GitHub Issue番号などの識別子"),
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .describe("タスクの簡潔なタイトル"),
});

// タスクIDスキーマ（複数のツールで共通）
const taskSessionIdSchema = z
  .string()
  .min(1, "taskSessionIdは必須です")
  .describe("startTaskで払い出されたタスクID");

// 各ツールのinputSchema
export const startTaskInputSchema = z.object({
  issue: issueSchema,
  initialSummary: z
    .string()
    .min(1, "初期サマリは必須です")
    .describe("着手時点の抽象的な状況や方針"),
});

export const updateTaskInputSchema = z.object({
  taskSessionId: taskSessionIdSchema,
  summary: z.string().min(1, "summaryは必須です").describe("進捗の抽象的説明"),
});

export const reportBlockedInputSchema = z.object({
  taskSessionId: taskSessionIdSchema,
  reason: z
    .string()
    .min(1, "reasonは必須です")
    .describe("詰まっている理由の要約"),
});

export const pauseTaskInputSchema = z.object({
  taskSessionId: taskSessionIdSchema,
  reason: z.string().min(1, "reasonは必須です").describe("休止理由の要約"),
});

export const resumeTaskInputSchema = z.object({
  taskSessionId: taskSessionIdSchema,
  summary: z.string().min(1, "summaryは必須です").describe("再開時のコメント"),
});

export const completeTaskInputSchema = z.object({
  taskSessionId: taskSessionIdSchema,
  summary: z
    .string()
    .min(1, "summaryは必須です")
    .describe("完了内容の抽象的サマリ"),
});

export const cancelTaskInputSchema = z.object({
  taskSessionId: taskSessionIdSchema,
  reason: z
    .string()
    .optional()
    .describe("中止理由（任意、Slackには送られません）"),
});

export const resolveBlockedInputSchema = z.object({
  taskSessionId: taskSessionIdSchema,
  blockReportId: z
    .string()
    .min(1, "blockReportIdは必須です")
    .describe(
      "解決したブロッキングのID（completeTaskレスポンスやreportBlockedレスポンスから取得）",
    ),
});

export const listTasksInputSchema = z.object({
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
});

// MCP レスポンス: 成功時
export function formatSuccessResponse(
  data: Record<string, unknown>,
  message: string,
) {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    structuredContent: data,
  };
}

// MCP レスポンス: エラー時
export function formatErrorResponse(error: Error) {
  return {
    content: [
      {
        type: "text" as const,
        text: error.message,
      },
    ],
  };
}
