import { describe, it, expect, vi, beforeEach } from "vitest";
import { setup } from "../../tests/vitest.helper";

// vitest.helperの後にインポートする
import { createMcpServer } from "./mcp-server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAiSdkModels } from "@/lib/ai";
import type {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

const { db, createTestUserAndWorkspace } = await setup();

const {
  notifyTaskStarted,
  notifyTaskUpdate,
  notifyTaskBlocked,
  notifyBlockResolved,
  notifyTaskPaused,
  notifyTaskResumed,
  notifyTaskCompleted,
} = vi.hoisted(() => ({
  notifyTaskStarted: vi.fn().mockResolvedValue({
    delivered: false,
    reason: "missing_config",
  }),
  notifyTaskUpdate: vi.fn().mockResolvedValue({
    delivered: false,
    reason: "missing_config",
  }),
  notifyTaskBlocked: vi.fn().mockResolvedValue({
    delivered: false,
    reason: "missing_config",
  }),
  notifyBlockResolved: vi.fn().mockResolvedValue({
    delivered: false,
    reason: "missing_config",
  }),
  notifyTaskPaused: vi.fn().mockResolvedValue({
    delivered: false,
    reason: "missing_config",
  }),
  notifyTaskResumed: vi.fn().mockResolvedValue({
    delivered: false,
    reason: "missing_config",
  }),
  notifyTaskCompleted: vi.fn().mockResolvedValue({
    delivered: false,
    reason: "missing_config",
  }),
}));

describe("createMcpServer", async () => {
  let client: Client;

  beforeEach(async () => {
    vi.mock("@/services/notificationService", () => {
      return {
        createNotificationService: () => ({
          notifyTaskStarted,
          notifyTaskUpdate,
          notifyTaskBlocked,
          notifyBlockResolved,
          notifyTaskPaused,
          notifyTaskResumed,
          notifyTaskCompleted,
        }),
      };
    });

    // 各テストの前にユーザーとワークスペースを作成
    const { user, workspace } = await createTestUserAndWorkspace();

    client = new Client({
      name: "test client",
      version: "0.1.0",
    });

    // インメモリ通信チャネルの作成
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    const ctx = {
      db,
      user,
      workspace,
      ai: createAiSdkModels({
        env: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        },
      }),
    };

    // クライアントとサーバーを接続
    await Promise.all([
      client.connect(clientTransport),
      createMcpServer(ctx).connect(serverTransport),
    ]);
  });

  describe("start_task", () => {
    it("GitHub issueでタスクを開始できる", async () => {
      const result = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: {
            provider: "github",
            id: "123",
            title: "テスト用のタスク",
          },
          initial_summary: "これはテスト用のタスク開始です",
        },
      })) as CallToolResult;

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const textContent = result.content[0] as TextContent;
      const responseData = JSON.parse(textContent.text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "タスクの追跡を開始しました。",
      });
      expect(responseData.task_session_id).toBeDefined();
      expect(responseData.issued_at).toBeDefined();
      expect(notifyTaskStarted).toHaveBeenCalledOnce();
    });

    it("手動タスクを開始できる", async () => {
      const result = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: {
            provider: "manual",
            title: "手動タスク",
          },
          initial_summary: "手動で作成したタスクです",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      const responseData = JSON.parse(textContent.text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "タスクの追跡を開始しました。",
      });
      expect(responseData.task_session_id).toBeDefined();
    });
  });

  describe("update_task", () => {
    it("タスクを更新できる", async () => {
      // まずタスクを開始
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "更新テスト" },
          initial_summary: "初期サマリ",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクを更新
      const result = (await client.callTool({
        name: "update_task",
        arguments: {
          task_session_id,
          summary: "進捗を更新しました",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "進捗を保存しました。",
      });
      expect(notifyTaskUpdate).toHaveBeenCalledOnce();
    });
  });

  describe("report_blocked", () => {
    it("タスクの詰まりを報告できる", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "ブロックテスト" },
          initial_summary: "初期サマリ",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      const result = (await client.callTool({
        name: "report_blocked",
        arguments: {
          task_session_id,
          reason: "APIのレスポンスが遅い",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "blocked",
        message: "詰まり情報を登録しました。",
      });
      expect(notifyTaskBlocked).toHaveBeenCalledOnce();
    });
  });

  describe("pause_task", () => {
    it("タスクを一時停止できる", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "一時停止テスト" },
          initial_summary: "初期サマリ",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      const result = (await client.callTool({
        name: "pause_task",
        arguments: {
          task_session_id,
          reason: "別の緊急タスクに対応",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "paused",
        message: "タスクを一時休止しました。",
      });
      expect(notifyTaskPaused).toHaveBeenCalledOnce();
    });
  });

  describe("resume_task", () => {
    it("一時停止したタスクを再開できる", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "再開テスト" },
          initial_summary: "初期サマリ",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // 一時停止
      await client.callTool({
        name: "pause_task",
        arguments: {
          task_session_id,
          reason: "一時中断",
        },
      });

      // 再開
      const result = (await client.callTool({
        name: "resume_task",
        arguments: {
          task_session_id,
          summary: "タスクを再開しました",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "タスクを再開しました。",
      });
      expect(notifyTaskResumed).toHaveBeenCalledOnce();
    });
  });

  describe("complete_task", () => {
    it("タスクを完了できる", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "完了テスト" },
          initial_summary: "初期サマリ",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      const result = (await client.callTool({
        name: "complete_task",
        arguments: {
          task_session_id,
          pr_url: "https://github.com/example/repo/pull/123",
          summary: "タスクを完了しました",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "completed",
        message: "完了報告を保存しました。",
      });
      expect(notifyTaskCompleted).toHaveBeenCalledOnce();
    });
  });

  describe("list_tasks", () => {
    it("タスク一覧を取得できる", async () => {
      // テスト用にいくつかタスクを作成
      await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "リストテスト1" },
          initial_summary: "タスク1",
        },
      });

      await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "リストテスト2" },
          initial_summary: "タスク2",
        },
      });

      const result = (await client.callTool({
        name: "list_tasks",
        arguments: {},
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(Array.isArray(responseData.tasks)).toBe(true);
      expect(responseData.tasks.length).toBeGreaterThanOrEqual(2);
      expect(responseData.tasks[0]).toHaveProperty("task_session_id");
      expect(responseData.tasks[0]).toHaveProperty("status");
    });

    it("ステータスでフィルタリングできる", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "フィルタテスト" },
          initial_summary: "タスク",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクを完了
      await client.callTool({
        name: "complete_task",
        arguments: {
          task_session_id,
          pr_url: "https://github.com/example/repo/pull/456",
          summary: "完了",
        },
      });

      const result = (await client.callTool({
        name: "list_tasks",
        arguments: {
          status: "completed",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(Array.isArray(responseData.tasks)).toBe(true);
      responseData.tasks.forEach((task: { status: string }) => {
        expect(task.status).toBe("completed");
      });
    });
  });
});
