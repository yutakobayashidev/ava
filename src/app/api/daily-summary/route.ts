import { NextResponse } from "next/server";
import { getCurrentSession } from "@/src/lib/session";
import { db } from "@/src/clients/drizzle";
import { createTaskRepository } from "@/src/repos";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { postMessage } from "@/src/clients/slack";
import { createWorkspaceRepository } from "@/src/repos";

export async function POST() {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskRepository = createTaskRepository({ db });

    // 今日の開始と終了の時刻を取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 全タスクを取得して、今日完了したものをフィルタリング
    const allTasks = await taskRepository.listTaskSessions({
      userId: user.id,
      status: "completed",
      limit: 100,
    });

    const todayCompletedTasks = allTasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedAt = new Date(task.completedAt);
      return completedAt >= today && completedAt < tomorrow;
    });

    if (todayCompletedTasks.length === 0) {
      return NextResponse.json(
        { error: "今日完了したタスクがありません" },
        { status: 400 }
      );
    }

    // 各タスクの完了情報を取得
    const tasksWithDetails = await Promise.all(
      todayCompletedTasks.map(async (task) => {
        const completion = await taskRepository.findCompletionByTaskSessionId(
          task.id
        );
        return {
          title: task.issueTitle,
          initialSummary: task.initialSummary,
          completionSummary: completion?.summary || "",
          prUrl: completion?.prUrl || "",
          duration: task.completedAt && task.createdAt
            ? task.completedAt.getTime() - task.createdAt.getTime()
            : 0,
        };
      })
    );

    // LLMで1日のまとめを生成
    const summary = await generateDailySummary(tasksWithDetails);

    // Slackに投稿
    const slackResult = await postToSlack(summary);

    return NextResponse.json({
      success: true,
      tasksCount: todayCompletedTasks.length,
      summary,
      slack: slackResult,
    });
  } catch (error) {
    console.error("Daily summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate daily summary" },
      { status: 500 }
    );
  }
}

async function generateDailySummary(
  tasks: Array<{
    title: string;
    initialSummary: string;
    completionSummary: string;
    prUrl: string;
    duration: number;
  }>
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // フォールバック: シンプルなまとめ
    return `本日は ${tasks.length} 件のタスクを完了しました。\n\n${tasks
      .map((t, i) => `${i + 1}. ${t.title}`)
      .join("\n")}`;
  }

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}時間${minutes}分`;
    return `${minutes}分`;
  };

  const prompt = `
以下は本日完了したタスクの一覧です。1日の業務報告として、簡潔で分かりやすいまとめを日本語で生成してください。

完了タスク (${tasks.length}件):
${tasks
  .map(
    (task, i) => `
${i + 1}. 【${task.title}】
   - 初期サマリ: ${task.initialSummary}
   - 完了サマリ: ${task.completionSummary}
   - 所要時間: ${formatDuration(task.duration)}
   - PR: ${task.prUrl}
`
  )
  .join("\n")}

まとめのガイドライン:
- 5〜10行程度で簡潔に
- 全体としてどんな成果があったかを明確に
- 各タスクの要点を箇条書きで
- チャットで報告するような自然な口調で
- 絵文字は使わない
- 「本日は〜」のような書き出しで始める
`.trim();

  try {
    const openai = createOpenAI({ apiKey });

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    });

    return text;
  } catch (error) {
    console.error("Failed to generate summary with LLM:", error);
    return `本日は ${tasks.length} 件のタスクを完了しました。\n\n${tasks
      .map((t, i) => `${i + 1}. ${t.title}`)
      .join("\n")}`;
  }
}

async function postToSlack(summary: string) {
  const workspaceRepository = createWorkspaceRepository({ db });
  const [workspace] = await workspaceRepository.listWorkspaces({ limit: 1 });

  const allowEnvFallback = !workspace?.botAccessToken;
  const channel =
    workspace?.notificationChannelId ?? (allowEnvFallback ? process.env.SLACK_CHANNEL_ID : undefined);
  const token = workspace?.botAccessToken ?? (allowEnvFallback ? process.env.SLACK_BOT_TOKEN : undefined);

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
