import { HonoEnv } from "@/types";
import { generateDailyReport } from "@/usecases/reports/generateDailyReport";

type DailyReportContext = {
  teamId: string;
  userId: string;
  ctx: HonoEnv["Variables"];
};

const handler = async ({ teamId, userId, ctx }: DailyReportContext) => {
  const result = await generateDailyReport(
    {
      slackTeamId: teamId,
      slackUserId: userId,
    },
    ctx,
  );

  // エラーハンドリング: ビジネスロジックの結果をSlackレスポンスに変換
  if (!result.success) {
    const errorMessages = {
      workspace_not_found: "ワークスペースが見つかりません",
      user_not_found: "ユーザーが見つかりません",
      no_activity: "今日のタスク活動がありません",
    };

    return {
      response_type: "ephemeral" as const,
      text: errorMessages[result.error],
    };
  }

  // 成功レスポンス: サマリをSlack形式に整形
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
