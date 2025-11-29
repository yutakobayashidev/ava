import { getCookie, deleteCookie } from "hono/cookie";

import { createHonoApp } from "@/app/create-app";
import { createWorkspaceRepository, createTaskRepository, createUserRepository } from "@/repos";
import { exchangeSlackInstallCode } from "@/lib/slackInstall";
import { validateSessionToken } from "@/lib/session";
import { postEphemeral } from "@/clients/slack";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fillPrompt } from "@/utils/prompts";
import { DAILY_SUMMARY_PROMPT } from "@/prompts/daily-summary";
import { verifySlackSignature } from "@/middleware/slack";

const app = createHonoApp();

const STATE_COOKIE = "slack_install_state";

const redirectWithMessage = (req: Request, path: string, params: Record<string, string>) => {
  const base = new URL(req.url).origin;
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

app.get("/install/callback", async (c) => {
  const sessionToken = getCookie(c, "session");

  const { user } = sessionToken ? await validateSessionToken(sessionToken) : { user: null };
  if (!user) {
    return c.redirect("/login?callbackUrl=/slack/install");
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, STATE_COOKIE);

  if (!code) {
    return c.redirect(
      redirectWithMessage(c.req.raw, "/slack/install", { error: "missing_code" }),
    );
  }

  if (!storedState || storedState !== state) {
    return c.redirect(
      redirectWithMessage(c.req.raw, "/slack/install", { error: "state_mismatch" }),
    );
  }

  try {
    const oauthResult = await exchangeSlackInstallCode(code);
    const db = c.get('db');
    const workspaceRepository = createWorkspaceRepository({ db });

    const existing = await workspaceRepository.findWorkspaceByExternalId({
      provider: "slack",
      externalId: oauthResult.teamId,
    });

    if (existing) {
      await workspaceRepository.updateWorkspaceCredentials({
        workspaceId: existing.id,
        botUserId: oauthResult.botUserId ?? null,
        botAccessToken: oauthResult.accessToken,
        botRefreshToken: oauthResult.refreshToken ?? null,
        name: oauthResult.teamName,
        domain: oauthResult.teamDomain ?? existing.domain,
      });
      await workspaceRepository.addMember({
        workspaceId: existing.id,
        userId: user.id,
      });
    } else {
      const workspace = await workspaceRepository.createWorkspace({
        provider: "slack",
        externalId: oauthResult.teamId,
        name: oauthResult.teamName,
        domain: oauthResult.teamDomain ?? null,
        botUserId: oauthResult.botUserId ?? null,
        botAccessToken: oauthResult.accessToken,
        botRefreshToken: oauthResult.refreshToken ?? null,
        installedAt: new Date(),
      });
      await workspaceRepository.addMember({
        workspaceId: workspace.id,
        userId: user.id,
      });
    }

    deleteCookie(c, STATE_COOKIE, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return c.redirect(
      redirectWithMessage(c.req.raw, "/onboarding/connect-slack", {
        installed: "1",
        team: oauthResult.teamName,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    return c.redirect(
      redirectWithMessage(c.req.raw, "/slack/install", { error: message }),
    );
  }
});

app.post("/commands", verifySlackSignature, async (c) => {
  try {
    const body = await c.req.parseBody();
    const teamId = body.team_id as string;
    const userId = body.user_id as string;
    const channelId = body.channel_id as string;

    if (!teamId || !userId || !channelId) {
      return c.text("Invalid request", 400);
    }

    const db = c.get("db");
    const workspaceRepository = createWorkspaceRepository({ db });
    const taskRepository = createTaskRepository({ db });
    const userRepository = createUserRepository({ db });

    // ワークスペースを取得
    const workspace = await workspaceRepository.findWorkspaceByExternalId({
      provider: "slack",
      externalId: teamId,
    });

    if (!workspace || !workspace.botAccessToken) {
      return c.text("ワークスペースが見つかりません", 200);
    }

    // SlackユーザーIDからDBユーザーを取得
    const user = await userRepository.findUserBySlackId(userId);

    if (!user) {
      return c.text("ユーザーが見つかりません", 200);
    }

    // 今日の開始と終了の時刻を取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 全タスクを取得
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
      await postEphemeral({
        token: workspace.botAccessToken,
        channel: channelId,
        user: userId,
        text: "今日のタスク活動がありません",
      });
      return c.text("", 200);
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

    // ephemeral messageとして送信
    await postEphemeral({
      token: workspace.botAccessToken,
      channel: channelId,
      user: userId,
      text: `:calendar: 本日の業務まとめ\n\n${summary}`,
    });

    return c.text("", 200);
  } catch (error) {
    console.error("Daily report error:", error);
    return c.text("エラーが発生しました", 200);
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

  const prompt = fillPrompt(DAILY_SUMMARY_PROMPT, {
    completedSection,
    activeSection,
  });

  const openai = createOpenAI({ apiKey });

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
  });

  return text;
}

export default app;
