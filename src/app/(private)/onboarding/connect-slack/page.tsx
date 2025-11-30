import type { Metadata } from "next";
import { db } from "@/clients/drizzle";
import { listChannels, type SlackChannel } from "@/clients/slack";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";
import { createWorkspaceRepository } from "@/repos";
import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingProgress } from "../OnboardingProgress";
import { requireAuth } from "@/lib/auth";
import { getSlackStatusMessage, isSuccessMessage } from "@/lib/slackMessages";

export const metadata: Metadata = {
  title: "Slackワークスペースを連携",
  description:
    "タスクの進捗をSlackに自動通知するため、ワークスペースと接続します。",
};

export default async function ConnectSlackPage({
  searchParams,
}: PageProps<"/onboarding/connect-slack">) {
  const { user } = await requireAuth();

  const params = await searchParams;
  const workspaceRepository = createWorkspaceRepository({ db });

  // ユーザーの Slack Team ID を使って既存ワークスペースを検索し、自動的に設定
  if (user.slackTeamId && !user.workspaceId) {
    const existingWorkspace =
      await workspaceRepository.findWorkspaceByExternalId({
        provider: "slack",
        externalId: user.slackTeamId,
      });

    if (existingWorkspace) {
      // 自動的にワークスペースを設定
      await workspaceRepository.setUserWorkspace(user.id, existingWorkspace.id);
    }
  }

  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

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

    const { user } = await requireAuth();

    const channelId = formData.get("channel_id");

    if (!channelId || typeof channelId !== "string") {
      redirect("/onboarding/connect-slack?error=missing_channel");
    }

    const workspaceRepository = createWorkspaceRepository({ db });
    const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

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

  const statusMessage = getSlackStatusMessage(params);
  const isSuccess = isSuccessMessage(params);

  return (
    <div className="min-h-screen bg-slate-50">
      <OnboardingProgress currentStep={1} />

      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">
              Slackワークスペースを連携
            </h1>
            <p className="mt-3 text-slate-600">
              タスクの進捗をSlackに自動通知するため、ワークスペースと接続します。
            </p>
          </div>

          {statusMessage && (
            <Alert variant={isSuccess ? "default" : "destructive"}>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Slack連携でできること
                </h2>
                <ul className="space-y-4 text-slate-600">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-slate-900">
                        自動でタスクを投稿
                      </p>
                      <p className="text-sm mt-1">
                        タスクを開始すると、自動的にSlackの指定チャンネルにスレッドが作成されます。
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-slate-900">
                        進捗をスレッドに同期
                      </p>
                      <p className="text-sm mt-1">
                        コーディング中の進捗、詰まり、完了などがすべてスレッドに記録され、チームがリアルタイムで状況を把握できます。
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-slate-900">
                        必要なときだけサポート
                      </p>
                      <p className="text-sm mt-1">
                        進捗が見えるため、過度なチェックインは不要。必要なときだけスレッドで質問やサポートができます。
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Slack接続
                </h2>
                {!workspace?.botAccessToken ? (
                  <Button asChild className="w-full" size="lg">
                    <Link href="/api/slack/install/start">
                      アプリをインストール
                      <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 rounded-md">
                          {workspace.iconUrl && (
                            <AvatarImage
                              src={workspace.iconUrl}
                              alt={workspace.name}
                            />
                          )}
                          <AvatarFallback className="rounded-md">
                            {getInitials(workspace.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">接続済み</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {workspace.name}
                            {workspace.domain ? ` (${workspace.domain})` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {workspace?.botAccessToken && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    通知チャンネルを選択
                  </h2>
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
