import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { db } from "@/clients/drizzle";
import { createWorkspaceRepository } from "@/repos";
import { listChannels, type SlackChannel } from "@/clients/slack";
import { OnboardingProgress } from "../OnboardingProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function ConnectSlackPage({
  searchParams,
}: PageProps<"/onboarding/connect-slack">) {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login?callbackUrl=/onboarding/connect-slack");
  }

  const params = await searchParams;
  const workspaceRepository = createWorkspaceRepository({ db });
  const [membership] = await workspaceRepository.listWorkspacesForUser({
    userId: user.id,
    limit: 1,
  });
  const workspace = membership?.workspace;

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
    const [membership] = await workspaceRepository.listWorkspacesForUser({
      userId: user.id,
      limit: 1,
    });
    const workspace = membership?.workspace;

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
      (channel) => channel.id === channelId,
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
    <div className="min-h-screen bg-slate-50">
      <OnboardingProgress currentStep={1} />

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Slackワークスペースを連携
              </h1>
              <p className="mt-3 text-slate-600">
                タスクの進捗をSlackに自動通知するため、ワークスペースと接続します。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                できること
              </h2>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span>タスク開始時に自動でSlackへ投稿</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span>進捗がスレッドに同期され、チームが状況を把握</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            {statusMessage && (
              <Alert variant={params.error ? "destructive" : "default"}>
                <AlertDescription>{statusMessage}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Slack接続</CardTitle>
              </CardHeader>
              <CardContent>
                {!workspace?.botAccessToken ? (
                  <Button asChild className="w-full" size="lg">
                    <Link href="/slack/install/start">
                      アプリをインストール
                      <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="font-medium">接続済み</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {workspace.name}
                        {workspace.domain ? ` (${workspace.domain})` : ""}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/slack/install/start">
                        別のワークスペースに接続
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {workspace?.botAccessToken && (
              <Card>
                <CardHeader>
                  <CardTitle>通知チャンネルを選択</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    進捗通知を投稿するSlackチャンネルを選んでください。
                  </p>

                  {channelError ? (
                    <Alert variant="destructive">
                      <AlertDescription>
                        チャンネル一覧の取得に失敗しました。
                        <div className="mt-1 text-xs">詳細: {channelError}</div>
                      </AlertDescription>
                    </Alert>
                  ) : channels.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        Botが参加しているチャンネルが見つかりません。
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <form
                      action={saveNotificationChannel}
                      className="space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="channel_id"
                          className="block text-sm font-medium"
                        >
                          通知先チャンネル
                        </label>
                        <select
                          id="channel_id"
                          name="channel_id"
                          defaultValue={workspace?.notificationChannelId ?? ""}
                          required
                          className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
                        >
                          <option value="" disabled>
                            選択してください
                          </option>
                          {channels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              #{channel.name}{" "}
                              {channel.isPrivate ? "(プライベート)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        プライベートチャンネルの場合は事前にボットを招待してください。
                      </p>
                      <Button type="submit" className="w-full" size="lg">
                        次へ
                        <ArrowRight />
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
