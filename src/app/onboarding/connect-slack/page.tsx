import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { db } from "@/clients/drizzle";
import { createWorkspaceRepository } from "@/repos";
import { listChannels, type SlackChannel } from "@/clients/slack";
import { OnboardingProgress } from "../OnboardingProgress";

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
  const workspaceRepository = createWorkspaceRepository({ db });
  const [workspace] = await workspaceRepository.listWorkspaces({ limit: 1 });

  // Slack連携済み + 通知先設定済みの場合は次のステップへ
  if (
    workspace?.botAccessToken &&
    workspace.notificationChannelId &&
    !params.error
  ) {
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

    const targetChannel = availableChannels.find(
      (channel) => channel.id === channelId
    );

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
      <OnboardingProgress currentStep={1} />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-blue-100 bg-white/70 p-8 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Step 1
              </p>
              <h1 className="mt-3 text-4xl font-bold text-slate-900">
                Slackワークスペースを連携
              </h1>
              <p className="mt-3 text-lg text-slate-600">
                タスクの進捗をSlackに自動通知するため、まずはワークスペースと接続します。
                ここで通知先まで設定すると、以降のステップがスムーズになります。
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                  所要時間 約30秒
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium">
                  進捗を自動でSlack共有
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold text-slate-900">
                連携で得られること
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      タスク開始の自動通知
                    </p>
                    <p className="text-sm text-slate-600">
                      エージェントがタスクを開始すると自動的にSlackへ投稿
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      リアルタイム進捗更新
                    </p>
                    <p className="text-sm text-slate-600">
                      進捗がスレッドに同期され、チームが状況を把握できる
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      完了とPRの自動共有
                    </p>
                    <p className="text-sm text-slate-600">
                      タスク完了時にPRリンクがSlackに投稿される
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            {statusMessage && (
              <div
                className={`rounded-2xl px-6 py-4 ${
                  params.error
                    ? "border border-red-200 bg-red-50 text-red-900"
                    : "border border-green-200 bg-green-50 text-green-900"
                }`}
              >
                {statusMessage}
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">
                  Slack接続
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  まずは連携
                </span>
              </div>

              {!workspace?.botAccessToken ? (
                <Link
                  href="/slack/install/start"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
                >
                  アプリをインストール
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    Slackと接続済み
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    ワークスペース: {workspace.name}
                    {workspace.domain ? ` (${workspace.domain})` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href="/slack/install/start"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      別のワークスペースに接続
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {workspace?.botAccessToken && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    通知チャンネルを選択
                  </h2>
                  <span className="text-xs font-semibold text-blue-700">
                    必須
                  </span>
                </div>
                <p className="mb-4 text-sm text-slate-600">
                  進捗通知を投稿するSlackチャンネルを選んでください。ボットがチャンネルに参加している必要があります。
                </p>

                {channelError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                    Slackのチャンネル一覧の取得に失敗しました。権限やネットワークを確認してください。
                    <div className="mt-1 break-words text-xs text-red-700">
                      詳細: {channelError}
                    </div>
                  </div>
                ) : channels.length === 0 ? (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
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
                              #{channel.name}{" "}
                              {channel.isPrivate ? "(プライベート)" : ""}
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
                      className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
                    >
                      チャンネルを保存して次へ
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
