import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

import { db } from "../clients/drizzle";
import { createTaskRepository } from "../repos";
import * as schema from "../db/schema";

type User = typeof schema.users.$inferSelect;

export function createMcpServer(user: User) {

    const server = new McpServer({
        name: "task-bridge-mcp",
        version: "1.0.0",
    });

    const taskRepository = createTaskRepository({ db });

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

    const toJsonResponse = (payload: Record<string, unknown>) =>
        toTextResponse(JSON.stringify(payload, null, 2));

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
            const session = await taskRepository.createTaskSession({
                userId: user.id,
                issueProvider: issue.provider,
                issueId: issue.id ?? null,
                issueTitle: issue.title,
                initialSummary: initial_summary,
            });

            return toJsonResponse({
                task_session_id: session.id,
                status: session.status,
                issued_at: session.createdAt,
                message: "タスクの追跡を開始しました。",
            });
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
            const { session, update } = await taskRepository.addTaskUpdate({
                taskSessionId: task_session_id,
                summary,
                rawContext: raw_context,
            });

            return toJsonResponse({
                task_session_id: session.id,
                update_id: update.id,
                status: session.status,
                summary: update.summary,
                message: "進捗を保存しました。",
            });
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
            const { session, blockReport } = await taskRepository.reportBlock({
                taskSessionId: task_session_id,
                reason,
                rawContext: raw_context,
            });

            return toJsonResponse({
                task_session_id: session.id,
                block_report_id: blockReport.id,
                status: session.status,
                reason: blockReport.reason,
                message: "詰まり情報を登録しました。",
            });
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
        async ({ task_session_id, pr_url, summary }) => {
            const { session, completion } = await taskRepository.completeTask({
                taskSessionId: task_session_id,
                prUrl: pr_url,
                summary,
            });

            return toJsonResponse({
                task_session_id: session.id,
                completion_id: completion.id,
                status: session.status,
                pr_url: completion.prUrl,
                message: "完了報告を保存しました。",
            });
        },
    );

    server.registerTool(
        "list_tasks",
        {
            title: "list_tasks",
            description: "ユーザーのタスク一覧を取得する。",
            inputSchema: z.object({
                status: z
                    .enum(["in_progress", "blocked", "completed"])
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
            const sessions = await taskRepository.listTaskSessions({
                userId: user.id,
                status,
                limit,
            });

            return toJsonResponse({
                total: sessions.length,
                tasks: sessions.map((session) => ({
                    task_session_id: session.id,
                    issue_provider: session.issueProvider,
                    issue_id: session.issueId,
                    issue_title: session.issueTitle,
                    status: session.status,
                    created_at: session.createdAt,
                    updated_at: session.updatedAt,
                    blocked_at: session.blockedAt,
                    completed_at: session.completedAt,
                })),
            });
        },
    );

    return server
}
