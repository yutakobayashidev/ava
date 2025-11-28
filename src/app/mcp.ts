import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

const server = new McpServer({
    name: "task-bridge-mcp",
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
    id: z
        .string()
        .trim()
        .optional()
        .describe("GitHub Issue番号などの識別子"),
    title: z
        .string()
        .min(1, "タイトルは必須です")
        .describe("タスクの簡潔なタイトル"),
});

const placeholderResponse = (toolName: string) =>
    toTextResponse(
        `${toolName} はAPI連携を伴わない定義のみのツールです。入力内容のバリデーション用途として利用してください。`,
    );

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
    async () => placeholderResponse("start_task"),
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
    async () => placeholderResponse("update_task"),
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
    async () => placeholderResponse("report_blocked"),
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
            pr_url: z
                .string()
                .url("有効なPR URLを入力してください")
                .describe("完了内容に紐づくPull Request"),
            summary: z
                .string()
                .min(1, "summaryは必須です")
                .describe("完了内容の抽象的サマリ"),
        }),
    },
    async () => placeholderResponse("complete_task"),
);

export default server;
