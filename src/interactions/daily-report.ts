import type {
  WorkspaceRepository,
  TaskRepository,
  UserRepository,
} from "@/repos";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { fillPrompt } from "@/utils/prompts";
import { DAILY_SUMMARY_PROMPT } from "@/prompts/daily-summary";

type BlockReport = {
  reason: string;
  createdAt: Date;
};

type CompletedTaskDetail = {
  title: string;
  initialSummary: string;
  completionSummary: string;
  prUrl: string;
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

type Repositories = {
  workspaceRepository: WorkspaceRepository;
  taskRepository: TaskRepository;
  userRepository: UserRepository;
};

type HandlerParams = {
  teamId: string;
  userId: string;
  repositories: Repositories;
};

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
   - PR: ${task.prUrl}
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

async function generateDailySummary(
  completedTasks: CompletedTaskDetail[],
  activeTasks: ActiveTaskDetail[],
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;

  const completedSection = formatCompletedTasks(completedTasks);
  const activeSection = formatActiveTasks(activeTasks);

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

const handler = async ({
  teamId,
  userId,
  repositories: { workspaceRepository, taskRepository, userRepository },
}: HandlerParams) => {
  // ワークスペースを取得
  const workspace = await workspaceRepository.findWorkspaceByExternalId({
    provider: "slack",
    externalId: teamId,
  });

  if (!workspace || !workspace.botAccessToken) {
    return {
      response_type: "ephemeral" as const,
      text: "ワークスペースが見つかりません",
    };
  }

  // SlackユーザーIDからDBユーザーを取得
  const user = await userRepository.findUserBySlackId(userId);

  if (!user) {
    return {
      response_type: "ephemeral" as const,
      text: "ユーザーが見つかりません",
    };
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
    },
  );

  if (todayCompletedTasks.length === 0 && todayActiveTasks.length === 0) {
    return {
      response_type: "ephemeral" as const,
      text: "今日のタスク活動がありません",
    };
  }

  // 各完了タスクの詳細情報を取得
  const completedTasksWithDetails = await Promise.all(
    todayCompletedTasks.map(async (task) => {
      const completion = await taskRepository.findCompletionByTaskSessionId(
        task.id,
      );
      const unresolvedBlocks = await taskRepository.getUnresolvedBlockReports(
        task.id,
      );
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
    }),
  );

  // 進行中・ブロック中タスクの詳細情報を取得
  const activeTasksWithDetails = await Promise.all(
    todayActiveTasks.map(async (task) => {
      const unresolvedBlocks = await taskRepository.getUnresolvedBlockReports(
        task.id,
      );
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
    }),
  );

  // LLMで1日のまとめを生成
  const summary = await generateDailySummary(
    completedTasksWithDetails,
    activeTasksWithDetails,
  );

  // ephemeral messageとしてレスポンス
  return {
    response_type: "ephemeral" as const,
    text: `:calendar: 本日の業務まとめ\n\n${summary}`,
  };
};

const dailyReportInteraction = {
  commandName: "/daily-report" as const,
  handler,
};

export default dailyReportInteraction;
