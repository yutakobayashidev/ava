import type { WorkspaceRepository, UserRepository } from "@/repos";
import type { Env } from "@/app/create-app";
import { generateDailyReport } from "@/usecases/reports/generateDailyReport";

type Repositories = {
  workspaceRepository: WorkspaceRepository;
  userRepository: UserRepository;
};

type DailyReportContext = {
  teamId: string;
  userId: string;
  repositories: Repositories;
  ctx: Env["Variables"];
};

const handler = async ({
  teamId,
  userId,
  repositories: { workspaceRepository, userRepository },
  ctx,
}: DailyReportContext) => {
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

  // 日報を生成
  const result = await generateDailyReport(
    {
      userId: user.id,
      workspaceId: workspace.id,
    },
    ctx,
  );

  if (!result.hasActivity) {
    return {
      response_type: "ephemeral" as const,
      text: "今日のタスク活動がありません",
    };
  }

  // ephemeral messageとしてレスポンス
  return {
    response_type: "ephemeral" as const,
    text: `:calendar: 本日の業務まとめ\n\n${result.summary}`,
  };
};

const dailyReportInteraction = {
  commandName: "/daily-report" as const,
  handler,
};

export default dailyReportInteraction;
