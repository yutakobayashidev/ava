import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle } from "lucide-react";
import { getCurrentSession } from "@/src/lib/session";
import { db } from "@/src/clients/drizzle";
import { createWorkspaceRepository } from "@/src/repos";
import { getSlackInstallConfig } from "@/src/lib/slackInstall";
import { listChannels, type SlackChannel } from "@/src/clients/slack";

type SearchParams = {
  installed?: string;
  team?: string;
  error?: string;
};

export default async function ConnectSlackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login?callbackUrl=/onboarding/connect-slack");
  }

  const params = await searchParams;
  const config = getSlackInstallConfig();
  const workspaceRepository = createWorkspaceRepository({ db });
  const [workspace] = await workspaceRepository.listWorkspaces({ limit: 1 });

  // Slack連携済み + 通知先設定済みの場合は次のステップへ
  if (workspace?.botAccessToken && workspace.notificationChannelId && !params.error) {
    redirect("/onboarding/setup-mcp");
  }

  let channels: SlackChannel[] = [];
  let channelError: string | null = null;

  if (workspace?.botAccessToken) {
    try {
      channels = await listChannels(workspace.botAccessToken);
    } catch (error) {
      channelError = error instanceof Error ? error.message : "unknown_error";
    }
  }

  async function saveNotificationChannel(formData: FormData) {
    "use server";

    const { user } = await getCurrentSession();

    if (!user) {
      redirect("/login?callbackUrl=/onboarding/connect-slack");
    }

    const channelId = formData.get("channel_id");

    if (!channelId || typeof channelId !== "string") {
      redirect("/onboarding/connect-slack?error=missing_channel");
    }

    const workspaceRepository = createWorkspaceRepository({ db });
    const [workspace] = await workspaceRepository.listWorkspaces({ limit: 1 });

    if (!workspace?.botAccessToken) {
      redirect("/onboarding/connect-slack?error=missing_token");
    }

    let availableChannels: SlackChannel[] = [];

    try {
      availableChannels = await listChannels(workspace.botAccessToken);
    } catch (error) {
      console.error("Failed to load Slack channels", error);
      redirect("/onboarding/connect-slack?error=channel_fetch_failed");
    }

    const targetChannel = availableChannels.find((channel) => channel.id === channelId);

    if (!targetChannel) {
      redirect("/onboarding/connect-slack?error=invalid_channel");
    }

    await workspaceRepository.updateNotificationChannel({
      workspaceId: workspace.id,
      channelId: targetChannel.id,
      channelName: targetChannel.name,
    });

    redirect("/onboarding/setup-mcp");
  }

  const statusMessage = (() => {
    if (params.installed === "1") {
      return `Slackワークスペースを連携しました (${
        params.team ?? "workspace"
      })`;
    }
    if (params.error === "invalid_channel") {
      return "エラー: 選択したチャンネルが見つかりませんでした";
    }
    if (params.error === "missing_channel") {
      return "エラー: チャンネルを選択してください";
    }
    if (params.error === "channel_fetch_failed") {
      return "エラー: チャンネル一覧の取得に失敗しました";
    }
    if (params.error) {
      return `エラー: ${params.error}`;
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <span className="font-semibold text-slate-900">Slack連携</span>
            </div>
            <div className="h-1 flex-1 mx-4 bg-slate-200 rounded">
              <div className="h-full w-1/3 bg-blue-600 rounded"></div>
            </div>
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <span className="font-medium text-slate-600">MCP接続</span>
            </div>
            <div className="h-1 flex-1 mx-4 bg-slate-200 rounded"></div>
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <span className="font-medium text-slate-600">完了</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Slackワークスペースを連携
            </h1>
            <p className="text-xl text-slate-600">
              タスクの進捗をSlackに自動通知するため、ワークスペースを接続します
            </p>
          </div>

          {statusMessage && (
            <div
              className={`rounded-xl px-6 py-4 mb-8 ${
                params.error
                  ? "bg-red-50 border border-red-200 text-red-900"
                  : "bg-green-50 border border-green-200 text-green-900"
              }`}
            >
              {statusMessage}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              連携で得られること
            </h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">タスク開始の自動通知</p>
                  <p className="text-slate-600 text-sm">
                    エージェントがタスクを開始すると自動的にSlackへ投稿
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">リアルタイム進捗更新</p>
                  <p className="text-slate-600 text-sm">
                    進捗がスレッドに同期され、チームが状況を把握できる
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">完了とPRの自動共有</p>
                  <p className="text-slate-600 text-sm">
                    タスク完了時にPRリンクがSlackに投稿される
                  </p>
                </div>
              </li>
            </ul>

            {!config ? (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-900">
                Slackアプリのクライアント設定が未設定です。環境変数を確認してください。
              </div>
            ) : !workspace?.botAccessToken ? (
              <Link
                href="/slack/install/start"
                className="w-full inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                アプリをインストール
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Slackと接続済み</p>
                <p className="text-sm text-slate-600 mt-1">
                  ワークスペース: {workspace.name}
                  {workspace.domain ? ` (${workspace.domain})` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href="/slack/install/start"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    別のワークスペースに接続
                  </Link>
                </div>
              </div>
            )}
          </div>

          {workspace?.botAccessToken && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">通知チャンネルを選択</h2>
              <p className="text-slate-600 mb-4">
                進捗通知を投稿するSlackチャンネルを選んでください。ボットがチャンネルに参加している必要があります。
              </p>

              {channelError ? (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900">
                  Slackのチャンネル一覧の取得に失敗しました。権限やネットワークを確認してください。
                  <div className="mt-1 text-xs text-red-700 break-words">詳細: {channelError}</div>
                </div>
              ) : channels.length === 0 ? (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-900">
                  Botが参加しているチャンネルが見つかりません。SlackでBotを追加してから再読み込みしてください。
                </div>
              ) : (
                <form action={saveNotificationChannel} className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="channel_id"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      通知先チャンネル
                    </label>
                    <div className="relative">
                      <select
                        id="channel_id"
                        name="channel_id"
                        defaultValue={workspace?.notificationChannelId ?? ""}
                        required
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-3 pr-10 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="" disabled>
                          通知先を選択してください
                        </option>
                        {channels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            #{channel.name} {channel.isPrivate ? "(プライベート)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    プライベートチャンネルの場合は事前にボットを招待してください。
                  </div>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    チャンネルを保存して次へ
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="text-center text-sm text-slate-500">
            <p>所要時間: 約30秒</p>
          </div>
        </div>
      </div>
    </div>
  );
}
