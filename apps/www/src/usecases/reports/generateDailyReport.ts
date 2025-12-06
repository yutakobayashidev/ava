import type { Env } from "@/app/create-app";
import {
  createTaskRepository,
  createWorkspaceRepository,
  createUserRepository,
} from "@/repos";
import { fillPrompt } from "@/utils/prompts";
import { DAILY_SUMMARY_PROMPT } from "@/prompts/daily-summary";
import { generateText } from "@/lib/ai";

type BlockReport = {
  reason: string | null;
  createdAt: Date;
};

type CompletedTaskDetail = {
  title: string;
  initialSummary: string;
  completionSummary: string;
  duration: number;
  unresolvedBlocks: BlockReport[];
};

type ActiveTaskDetail = {
  title: string;
  status: string;
  initialSummary: string;
  latestUpdate: string;
  unresolvedBlocks: BlockReport[];
};

type GenerateDailyReport = {
  slackTeamId: string;
  slackUserId: string;
};

type DailyReportResult =
  | { success: false; error: "workspace_not_found" | "user_not_found" }
  | { success: false; error: "no_activity" }
  | { success: true; summary: string };

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}時間${minutes}分`;
  return `${minutes}分`;
}

function formatCompletedTasks(tasks: CompletedTaskDetail[]): string {
  if (tasks.length === 0) return "";

  const tasksList = tasks
    .map((task, i) => {
      const blocks =
        task.unresolvedBlocks.length > 0
          ? `- ⚠️ 未解決のブロッキング: ${task.unresolvedBlocks.map((b) => b.reason).join(", ")}`
          : "";

      return `${i + 1}. 【${task.title}】
   - 初期サマリ: ${task.initialSummary}
   - 完了サマリ: ${task.completionSummary}
   - 所要時間: ${formatDuration(task.duration)}
   ${blocks}`;
    })
    .join("\n");

  return `完了タスク (${tasks.length}件):\n${tasksList}`;
}

function formatActiveTasks(tasks: ActiveTaskDetail[]): string {
  if (tasks.length === 0) return "";

  const tasksList = tasks
    .map((task, i) => {
      const statusLabel = task.status === "blocked" ? "ブロック中" : "進行中";
      const latestUpdate = task.latestUpdate
        ? `- 最新の更新: ${task.latestUpdate}`
        : "";
      const blocks =
        task.unresolvedBlocks.length > 0
          ? `- ⚠️ ブロッキング: ${task.unresolvedBlocks.map((b) => b.reason).join(", ")}`
          : "";

      return `${i + 1}. 【${task.title}】 (${statusLabel})
   - 初期サマリ: ${task.initialSummary}
   ${latestUpdate}
   ${blocks}`;
    })
    .join("\n");

  return `進行中・ブロック中タスク (${tasks.length}件):\n${tasksList}`;
}

function buildDailySummaryPrompt(
  completedTasks: CompletedTaskDetail[],
  activeTasks: ActiveTaskDetail[],
): string {
  const completedSection = formatCompletedTasks(completedTasks);
  const activeSection = formatActiveTasks(activeTasks);

  return fillPrompt(DAILY_SUMMARY_PROMPT, {
    completedSection,
    activeSection,
  });
}

export const generateDailyReport = async (
  params: GenerateDailyReport,
  ctx: Env["Variables"],
): Promise<DailyReportResult> => {
  const { slackTeamId, slackUserId } = params;
  const { db, ai } = ctx;

  const workspaceRepository = createWorkspaceRepository({ db });
  const userRepository = createUserRepository({ db });
  const taskRepository = createTaskRepository({ db });

  // ワークスペースを取得
  const workspace = await workspaceRepository.findWorkspaceByExternalId({
    provider: "slack",
    externalId: slackTeamId,
  });

  if (!workspace || !workspace.botAccessToken) {
    return { success: false, error: "workspace_not_found" };
  }

  // SlackユーザーIDとチームIDからDBユーザーを取得
  const user = await userRepository.findUserBySlackIdAndTeamId(
    slackUserId,
    slackTeamId,
  );

  if (!user) {
    return { success: false, error: "user_not_found" };
  }

  // 今日の開始と終了の時刻を取得
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 今日完了したタスクを取得（1回のクエリで完了イベント情報も含む）
  const todayCompletedTasks = await taskRepository.getTodayCompletedTasks({
    userId: user.id,
    workspaceId: workspace.id,
    dateRange: { from: today, to: tomorrow },
  });

  // 今日更新された進行中・ブロック中タスクを取得（日付フィルタをDBで実行）
  const inProgressTasks = await taskRepository.listTaskSessions({
    userId: user.id,
    workspaceId: workspace.id,
    status: "in_progress",
    updatedAfter: today,
    updatedBefore: tomorrow,
    limit: 100,
  });
  const blockedTasks = await taskRepository.listTaskSessions({
    userId: user.id,
    workspaceId: workspace.id,
    status: "blocked",
    updatedAfter: today,
    updatedBefore: tomorrow,
    limit: 100,
  });

  const todayActiveTasks = [...inProgressTasks, ...blockedTasks];

  if (todayCompletedTasks.length === 0 && todayActiveTasks.length === 0) {
    return { success: false, error: "no_activity" };
  }

  // 全タスクのIDを収集
  const allTaskIds = [
    ...todayCompletedTasks.map((t) => t.id),
    ...todayActiveTasks.map((t) => t.id),
  ];

  // バルクでunresolvedBlocksとupdateEventsを取得
  const unresolvedBlocksMap =
    await taskRepository.getBulkUnresolvedBlockReports(allTaskIds);
  const updateEventsMap = await taskRepository.getBulkLatestEvents({
    taskSessionIds: todayActiveTasks.map((t) => t.id),
    eventType: "updated",
    limit: 5,
  });

  // 各完了タスクの詳細情報を構築
  const completedTasksWithDetails = todayCompletedTasks.map((task) => {
    const unresolvedBlocks = unresolvedBlocksMap.get(task.id) || [];
    return {
      title: task.issueTitle,
      initialSummary: task.initialSummary,
      completionSummary: task.completionSummary || "",
      duration: task.completedAt.getTime() - task.createdAt.getTime(),
      unresolvedBlocks: unresolvedBlocks.map((block) => ({
        reason: block.reason,
        createdAt: block.createdAt,
      })),
    };
  });

  // 進行中・ブロック中タスクの詳細情報を構築
  const activeTasksWithDetails = todayActiveTasks.map((task) => {
    const unresolvedBlocks = unresolvedBlocksMap.get(task.id) || [];
    const updateEvents = updateEventsMap.get(task.id) || [];
    return {
      title: task.issueTitle,
      status: task.status,
      initialSummary: task.initialSummary,
      latestUpdate: updateEvents[0]?.summary || "",
      unresolvedBlocks: unresolvedBlocks.map((block) => ({
        reason: block.reason,
        createdAt: block.createdAt,
      })),
    };
  });

  // LLMで1日のまとめを生成
  const prompt = buildDailySummaryPrompt(
    completedTasksWithDetails,
    activeTasksWithDetails,
  );

  const aiGenerateText = generateText(ai.openai("gpt-4o-mini"));
  const { text: summary } = await aiGenerateText(prompt);

  return {
    success: true,
    summary,
  };
};
