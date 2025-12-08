import { beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "../../tests/vitest.helper";

// vitest.helperの後にインポートする
import { createAiSdkModels } from "@/lib/server/ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import type Stripe from "stripe";
import { createMcpServer } from "./mcp-server";

const { db, createTestUserAndWorkspace } = await setup();

describe("createMcpServer", async () => {
  let client: Client;

  beforeEach(async () => {
    vi.mock("@/services/slackNotificationService", () => {
      return {
        createSlackNotificationService: () => ({
          postMessage: vi.fn().mockResolvedValue({
            delivered: false,
            error: "missing_config",
          }),
          addReaction: vi.fn().mockResolvedValue({
            delivered: false,
            error: "missing_config",
          }),
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

    // モックのContextを作成
    const mockContext = {
      get: (key: string) => {
        const values = {
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
        return values[key as keyof typeof values];
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // クライアントとサーバーを接続
    await Promise.all([
      client.connect(clientTransport),
      createMcpServer(mockContext).connect(serverTransport),
    ]);
  });

  describe("startTask", () => {
    it("GitHub issueでタスクを開始できる", async () => {
      const result = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: {
            provider: "github",
            id: "123",
            title: "テスト用のタスク",
          },
          initialSummary: "これはテスト用のタスク開始です",
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
      expect(responseData.taskSessionId).toBeDefined();
      expect(responseData.issuedAt).toBeDefined();
    });

    it("手動タスクを開始できる", async () => {
      const result = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: {
            provider: "manual",
            title: "手動タスク",
          },
          initialSummary: "手動で作成したタスクです",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      const responseData = JSON.parse(textContent.text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "タスクの追跡を開始しました。",
      });
      expect(responseData.taskSessionId).toBeDefined();
    });
  });

  describe("updateTask", () => {
    it("タスクを更新できる", async () => {
      // まずタスクを開始
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "更新テスト" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクを更新
      const result = (await client.callTool({
        name: "updateTask",
        arguments: {
          taskSessionId,
          summary: "進捗を更新しました",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "進捗を保存しました。",
      });
    });

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "updateTask",
        arguments: {
          taskSessionId: "non-existent-id",
          summary: "進捗を更新しました",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });

    it("完了済みタスクは更新できない", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "完了済み更新テスト" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクを完了
      await client.callTool({
        name: "completeTask",
        arguments: {
          taskSessionId,
          summary: "完了しました",
        },
      });

      // 完了済みタスクを更新しようとする
      const result = (await client.callTool({
        name: "updateTask",
        arguments: {
          taskSessionId,
          summary: "完了後の更新",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toContain(
        "Invalid status transition: completed → in_progress. Allowed transitions from completed: []",
      );
    });
  });

  describe("reportBlocked", () => {
    it("タスクのブロッキングを報告できる", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "ブロックテスト" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      const result = (await client.callTool({
        name: "reportBlocked",
        arguments: {
          taskSessionId,
          reason: "APIのレスポンスが遅い",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "blocked",
        message: "ブロッキング情報を登録しました。",
      });
    });

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "reportBlocked",
        arguments: {
          taskSessionId: "non-existent-id",
          reason: "ブロッキングが発生しました",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });
  });

  describe("pauseTask", () => {
    it("タスクを一時停止できる", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "一時停止テスト" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      const result = (await client.callTool({
        name: "pauseTask",
        arguments: {
          taskSessionId,
          reason: "別の緊急タスクに対応",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "paused",
        message: "タスクを一時休止しました。",
      });
    });

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "pauseTask",
        arguments: {
          taskSessionId: "non-existent-id",
          reason: "一時停止します",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });
  });

  describe("resumeTask", () => {
    it("一時停止したタスクを再開できる", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "再開テスト" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // 一時停止
      await client.callTool({
        name: "pauseTask",
        arguments: {
          taskSessionId,
          reason: "一時中断",
        },
      });

      // 再開
      const result = (await client.callTool({
        name: "resumeTask",
        arguments: {
          taskSessionId,
          summary: "タスクを再開しました",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "タスクを再開しました。",
      });
    });

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "resumeTask",
        arguments: {
          taskSessionId: "non-existent-id",
          summary: "再開します",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });

    it("完了したタスクは再開できない", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "完了後再開テスト" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクを完了
      await client.callTool({
        name: "completeTask",
        arguments: {
          taskSessionId,
          summary: "完了しました",
        },
      });

      // 完了したタスクを再開しようとする
      const result = (await client.callTool({
        name: "resumeTask",
        arguments: {
          taskSessionId,
          summary: "再開します",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toContain(
        "Invalid status transition: completed → in_progress. Allowed transitions from completed: []",
      );
      expect(textContent.text).toContain("completed → in_progress");
    });
  });

  describe("completeTask", () => {
    it("タスクを完了できる", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "完了テスト" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      const result = (await client.callTool({
        name: "completeTask",
        arguments: {
          taskSessionId,
          summary: "タスクを完了しました",
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "completed",
        message: "完了報告を保存しました。",
      });
    });

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "completeTask",
        arguments: {
          taskSessionId: "non-existent-id",
          summary: "完了しました",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });
  });

  describe("resolveBlocked", () => {
    it("ブロッキングを解決できる", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "解決テスト" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクをブロック状態にする
      const blockResult = (await client.callTool({
        name: "reportBlocked",
        arguments: {
          taskSessionId,
          reason: "依存関係の問題",
        },
      })) as CallToolResult;
      const { blockReportId } = JSON.parse(
        (blockResult.content[0] as TextContent).text,
      );

      // ブロッキングを解決
      const result = (await client.callTool({
        name: "resolveBlocked",
        arguments: {
          taskSessionId,
          blockReportId,
        },
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        status: "in_progress",
        message: "ブロッキングの解決を報告しました。",
      });
    });

    it("存在しないタスクIDでエラーになる", async () => {
      const result = (await client.callTool({
        name: "resolveBlocked",
        arguments: {
          taskSessionId: "non-existent-id",
          blockReportId: "some-block-id",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("タスクセッションが見つかりません");
    });

    it("存在しないブロックレポートIDでエラーになる", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "不正ブロックID" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // ブロック状態にする
      await client.callTool({
        name: "reportBlocked",
        arguments: {
          taskSessionId,
          reason: "テスト",
        },
      });

      // 存在しないblockReportIdで解決しようとする
      const result = (await client.callTool({
        name: "resolveBlocked",
        arguments: {
          taskSessionId,
          blockReportId: "non-existent-block-id",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toBe("Block not found or already resolved");
    });

    it("完了したタスクのブロックは解決できない", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "完了後ブロック解決" },
          initialSummary: "初期サマリ",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクをブロック状態にする
      const blockResult = (await client.callTool({
        name: "reportBlocked",
        arguments: {
          taskSessionId,
          reason: "テスト",
        },
      })) as CallToolResult;
      const { blockReportId } = JSON.parse(
        (blockResult.content[0] as TextContent).text,
      );

      // タスクを完了（blockedからcompletedへの遷移はできないので、まずin_progressに戻す）
      // ただし、この状態遷移は不正なので、ブロック解決してから完了する
      await client.callTool({
        name: "resolveBlocked",
        arguments: {
          taskSessionId,
          blockReportId,
        },
      });

      await client.callTool({
        name: "completeTask",
        arguments: {
          taskSessionId,
          summary: "完了しました",
        },
      });

      // 完了したタスクのブロックを解決しようとする（不正なblockReportIdを使う）
      const result = (await client.callTool({
        name: "resolveBlocked",
        arguments: {
          taskSessionId,
          blockReportId: "dummy-id",
        },
      })) as CallToolResult;

      const textContent = result.content[0] as TextContent;
      expect(textContent.text).toContain("Block not found or already resolved");
    });
  });

  describe("listTasks", () => {
    it("タスク一覧を取得できる", async () => {
      // テスト用にいくつかタスクを作成
      await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "リストテスト1" },
          initialSummary: "タスク1",
        },
      });

      await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "リストテスト2" },
          initialSummary: "タスク2",
        },
      });

      const result = (await client.callTool({
        name: "listTasks",
        arguments: {},
      })) as CallToolResult;

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(Array.isArray(responseData.tasks)).toBe(true);
      expect(responseData.tasks.length).toBeGreaterThanOrEqual(2);
      expect(responseData.tasks[0]).toHaveProperty("taskSessionId");
      expect(responseData.tasks[0]).toHaveProperty("status");
    });

    it("ステータスでフィルタリングできる", async () => {
      const startResult = (await client.callTool({
        name: "startTask",
        arguments: {
          issue: { provider: "manual", title: "フィルタテスト" },
          initialSummary: "タスク",
        },
      })) as CallToolResult;
      const { taskSessionId } = JSON.parse(
        (startResult.content[0] as TextContent).text,
      );

      // タスクを完了
      await client.callTool({
        name: "completeTask",
        arguments: {
          taskSessionId,
          prUrl: "https://github.com/example/repo/pull/456",
          summary: "完了",
        },
      });

      const result = (await client.callTool({
        name: "listTasks",
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
