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
import type Stripe from "stripe";

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
      stripe: {} as Stripe,
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

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "update_task",
        arguments: {
          task_session_id: "non-existent-id",
          summary: "進捗を更新しました",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });

    it("完了済みタスクは更新できない", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "完了済み更新テスト" },
          initial_summary: "初期サマリ",
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
          summary: "完了しました",
        },
      });

      // 完了済みタスクを更新しようとする
      const result = (await client.callTool({
        name: "update_task",
        arguments: {
          task_session_id,
          summary: "完了後の更新",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toContain("Invalid status transition");
      expect(textContent.text).toContain("completed → in_progress");
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

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "report_blocked",
        arguments: {
          task_session_id: "non-existent-id",
          reason: "詰まりました",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
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

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "pause_task",
        arguments: {
          task_session_id: "non-existent-id",
          reason: "一時停止します",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
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

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "resume_task",
        arguments: {
          task_session_id: "non-existent-id",
          summary: "再開します",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });

    it("完了したタスクは再開できない", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "完了後再開テスト" },
          initial_summary: "初期サマリ",
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
          summary: "完了しました",
        },
      });

      // 完了したタスクを再開しようとする
      const result = (await client.callTool({
        name: "resume_task",
        arguments: {
          task_session_id,
          summary: "再開します",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toContain("Invalid status transition");
      expect(textContent.text).toContain("completed → in_progress");
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

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "complete_task",
        arguments: {
          task_session_id: "non-existent-id",
          summary: "完了しました",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });
  });

  describe("resolve_blocked", () => {
    it("ブロッキングを解決できる", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "解決テスト" },
          initial_summary: "初期サマリ",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクをブロック状態にする
      const blockResult = (await client.callTool({
        name: "report_blocked",
        arguments: {
          task_session_id,
          reason: "依存関係の問題",
        },
      })) as CallToolResult;
      const { block_report_id } = JSON.parse(
        (blockResult.content[0] as TextContent).text,
      );

      // ブロッキングを解決
      const result = (await client.callTool({
        name: "resolve_blocked",
        arguments: {
          task_session_id,
          block_report_id,
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "ブロッキングの解決を報告しました。",
      });
      expect(notifyBlockResolved).toHaveBeenCalledOnce();
    });

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "resolve_blocked",
        arguments: {
          task_session_id: "non-existent-id",
          block_report_id: "some-block-id",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });

    it("存在しないブロックレポートIDでエラーになる", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "不正ブロックID" },
          initial_summary: "初期サマリ",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // ブロック状態にする
      await client.callTool({
        name: "report_blocked",
        arguments: {
          task_session_id,
          reason: "テスト",
        },
      });

      // 存在しないblock_report_idで解決しようとする
      const result = (await client.callTool({
        name: "resolve_blocked",
        arguments: {
          task_session_id,
          block_report_id: "non-existent-block-id",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("ブロッキングの解決処理に失敗しました");
    });

    it("完了したタスクのブロックは解決できない", async () => {
      const startResult = (await client.callTool({
        name: "start_task",
        arguments: {
          issue: { provider: "manual", title: "完了後ブロック解決" },
          initial_summary: "初期サマリ",
        },
      })) as CallToolResult;
      const { task_session_id } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクをブロック状態にする
      const blockResult = (await client.callTool({
        name: "report_blocked",
        arguments: {
          task_session_id,
          reason: "テスト",
        },
      })) as CallToolResult;
      const { block_report_id } = JSON.parse(
        (blockResult.content[0] as TextContent).text,
      );

      // タスクを完了（blockedからcompletedへの遷移はできないので、まずin_progressに戻す）
      // ただし、この状態遷移は不正なので、ブロック解決してから完了する
      await client.callTool({
        name: "resolve_blocked",
        arguments: {
          task_session_id,
          block_report_id,
        },
      });

      await client.callTool({
        name: "complete_task",
        arguments: {
          task_session_id,
          summary: "完了しました",
        },
      });

      // 完了したタスクのブロックを解決しようとする（不正なblock_report_idを使う）
      const result = (await client.callTool({
        name: "resolve_blocked",
        arguments: {
          task_session_id,
          block_report_id: "dummy-id",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toContain("Invalid status transition");
      expect(textContent.text).toContain("completed → in_progress");
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
