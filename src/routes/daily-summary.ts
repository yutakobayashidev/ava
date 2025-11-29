import { createHonoApp } from "@/app/create-app";
import { createTaskRepository } from "@/repos";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { postMessage } from "@/clients/slack";
import { oauthMiddleware } from "@/middleware/oauth";
import type { Workspace } from "@/db/schema";

const app = createHonoApp();

app.post("/", oauthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const db = c.get("db");

    const taskRepository = createTaskRepository({ db });

    // 今日の開始と終了の時刻を取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 全タスクを取得（完了・進行中・ブロック中すべて）
    const allCompletedTasks = await taskRepository.listTaskSessions({
      userId: user.id,
      workspaceId: workspace.id,
      status: "completed",
      limit: 100,
    });
    const inProgressTasks = await taskRepository.listTaskSessions({
      userId: user.id,
      workspaceId: workspace.id,
      status: "in_progress",
      limit: 100,
    });
    const blockedTasks = await taskRepository.listTaskSessions({
      userId: user.id,
      workspaceId: workspace.id,
      status: "blocked",
      limit: 100,
    });

    // 今日完了したタスクをフィルタリング
    const todayCompletedTasks = allCompletedTasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedAt = new Date(task.completedAt);
      return completedAt >= today && completedAt < tomorrow;
    });

    // 今日更新された進行中・ブロック中タスクをフィルタリング
    const todayActiveTasks = [...inProgressTasks, ...blockedTasks].filter(
      (task) => {
        const updatedAt = new Date(task.updatedAt);
        return updatedAt >= today && updatedAt < tomorrow;
      }
    );

    if (todayCompletedTasks.length === 0 && todayActiveTasks.length === 0) {
      return c.json({ error: "今日のタスク活動がありません" }, 400);
    }

    // 各完了タスクの詳細情報を取得
    const completedTasksWithDetails = await Promise.all(
      todayCompletedTasks.map(async (task) => {
        const completion = await taskRepository.findCompletionByTaskSessionId(
          task.id
        );
        const unresolvedBlocks =
          await taskRepository.getUnresolvedBlockReports(task.id);
        return {
          title: task.issueTitle,
          initialSummary: task.initialSummary,
          completionSummary: completion?.summary || "",
          prUrl: completion?.prUrl || "",
          duration:
            task.completedAt && task.createdAt
              ? task.completedAt.getTime() - task.createdAt.getTime()
              : 0,
          unresolvedBlocks: unresolvedBlocks.map((block) => ({
            reason: block.reason,
            createdAt: block.createdAt,
          })),
        };
      })
    );

    // 進行中・ブロック中タスクの詳細情報を取得
    const activeTasksWithDetails = await Promise.all(
      todayActiveTasks.map(async (task) => {
        const unresolvedBlocks =
          await taskRepository.getUnresolvedBlockReports(task.id);
        const updates = await taskRepository.listUpdates(task.id, { limit: 5 });
        return {
          title: task.issueTitle,
          status: task.status,
          initialSummary: task.initialSummary,
          latestUpdate: updates[0]?.summary || "",
          unresolvedBlocks: unresolvedBlocks.map((block) => ({
            reason: block.reason,
            createdAt: block.createdAt,
          })),
        };
      })
    );

    // LLMで1日のまとめを生成
    const summary = await generateDailySummary(
      completedTasksWithDetails,
      activeTasksWithDetails
    );

    // Slackに投稿
    const slackResult = await postToSlack(summary, workspace);

    return c.json({
      success: true,
      completedTasksCount: todayCompletedTasks.length,
      activeTasksCount: todayActiveTasks.length,
      summary,
      slack: slackResult,
    });
  } catch (error) {
    console.error("Daily summary error:", error);
    return c.json({ error: "Failed to generate daily summary" }, 500);
  }
});

async function generateDailySummary(
  completedTasks: Array<{
    title: string;
    initialSummary: string;
    completionSummary: string;
    prUrl: string;
    duration: number;
    unresolvedBlocks: Array<{
      reason: string;
      createdAt: Date;
    }>;
  }>,
  activeTasks: Array<{
    title: string;
    status: string;
    initialSummary: string;
    latestUpdate: string;
    unresolvedBlocks: Array<{
      reason: string;
      createdAt: Date;
    }>;
  }>
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}時間${minutes}分`;
    return `${minutes}分`;
  };

  const completedSection =
    completedTasks.length > 0
      ? `
完了タスク (${completedTasks.length}件):
${completedTasks
  .map(
    (task, i) => `
${i + 1}. 【${task.title}】
   - 初期サマリ: ${task.initialSummary}
   - 完了サマリ: ${task.completionSummary}
   - 所要時間: ${formatDuration(task.duration)}
   - PR: ${task.prUrl}
   ${task.unresolvedBlocks.length > 0 ? `- ⚠️ 未解決のブロッキング: ${task.unresolvedBlocks.map((b) => b.reason).join(", ")}` : ""}
`
  )
  .join("\n")}`
      : "";

  const activeSection =
    activeTasks.length > 0
      ? `
進行中・ブロック中タスク (${activeTasks.length}件):
${activeTasks
  .map(
    (task, i) => `
${i + 1}. 【${task.title}】 (${task.status === "blocked" ? "ブロック中" : "進行中"})
   - 初期サマリ: ${task.initialSummary}
   ${task.latestUpdate ? `- 最新の更新: ${task.latestUpdate}` : ""}
   ${task.unresolvedBlocks.length > 0 ? `- ⚠️ ブロッキング: ${task.unresolvedBlocks.map((b) => b.reason).join(", ")}` : ""}
`
  )
  .join("\n")}`
      : "";

  const prompt = `
以下は本日のタスク活動の一覧です。1日の業務報告として、簡潔で分かりやすいまとめを日本語で生成してください。

${completedSection}
${activeSection}

まとめのガイドライン:
- 10〜15行程度で簡潔に
- 完了タスクの成果を明確に記載
- 進行中・ブロック中のタスクがある場合は、状況を簡潔に記載
- 未解決のブロッキングがある場合は、注意喚起として明記
- 各タスクの要点を箇条書きで
- チャットで報告するような自然な口調で
- 絵文字は使わない
- 「本日は〜」のような書き出しで始める
  `.trim();

  const openai = createOpenAI({ apiKey });

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
  });

  return text;
}

async function postToSlack(summary: string, workspace: Workspace) {
  const channel = workspace.notificationChannelId;
  const token = workspace.botAccessToken;

  if (!channel) {
    return { delivered: false, reason: "missing_channel" };
  }

  if (!token) {
    return { delivered: false, reason: "missing_token" };
  }

  try {
    const result = await postMessage({
      token,
      channel,
      text: `:calendar: 本日の業務まとめ\n\n${summary}`,
    });

    return {
      delivered: true,
      channel: result.channel,
      threadTs: result.ts,
    };
  } catch (error) {
    console.error("Failed to post to Slack:", error);
    return {
      delivered: false,
      reason: "api_error",
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
}

export default app;
