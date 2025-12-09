import { Header } from "@/components/header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getWorkspaceBotToken } from "@/lib/slack";
import { createWorkspaceRepository } from "@/repos";
import { db } from "@ava/database/client";
import { listChannels, type SlackChannel } from "@ava/integrations/slack";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "通知チャンネル変更",
  description: "Slack通知チャンネルの変更",
};

export default async function ChannelSettingsPage({
  searchParams,
}: PageProps<"/settings/channel">) {
  const { user } = await auth();
  const params = await searchParams;

  const workspaceRepository = createWorkspaceRepository(db);
  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

  if (!workspace?.botAccessToken) {
    redirect("/settings?error=no_bot_token");
  }

  let channels: SlackChannel[] = [];
  let channelError: string | null = null;

  try {
    const validToken = await getWorkspaceBotToken({
      workspace,
      workspaceRepository,
    });
    channels = await listChannels(validToken);
  } catch (error) {
    channelError = error instanceof Error ? error.message : "unknown_error";
  }

  async function saveNotificationChannel(formData: FormData) {
    "use server";

    const { user } = await auth();

    const channelId = formData.get("channel_id");

    if (!channelId || typeof channelId !== "string") {
      redirect("/settings/channel?error=missing_channel");
    }

    const workspaceRepository = createWorkspaceRepository(db);
    const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

    if (!workspace?.botAccessToken) {
      redirect("/settings/channel?error=missing_token");
    }

    let availableChannels: SlackChannel[] = [];

    try {
      const validToken = await getWorkspaceBotToken({
        workspace,
        workspaceRepository,
      });
      availableChannels = await listChannels(validToken);
    } catch (error) {
      console.error("Failed to load Slack channels", error);
      redirect("/settings/channel?error=channel_fetch_failed");
    }

    const targetChannel = availableChannels.find(
      (channel) => channel.id === channelId,
    );

    if (!targetChannel) {
      redirect("/settings/channel?error=invalid_channel");
    }

    await workspaceRepository.updateNotificationChannel({
      workspaceId: workspace.id,
      channelId: targetChannel.id,
      channelName: targetChannel.name,
    });

    redirect("/settings?success=channel_updated");
  }

  const statusMessage = (() => {
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
      <Header user={user} className="bg-slate-50" />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
              設定に戻る
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              通知チャンネル変更
            </h1>
            <p className="mt-2 text-slate-600">
              タスク通知を送信するSlackチャンネルを変更できます
            </p>
          </div>

          {statusMessage && (
            <Alert variant="destructive">
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>現在の設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">ワークスペース</p>
                    <p className="font-medium text-slate-900">
                      {workspace.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">現在のチャンネル</p>
                    <p className="font-medium text-slate-900">
                      {workspace.notificationChannelName
                        ? `#${workspace.notificationChannelName}`
                        : "未設定"}
                    </p>
                  </div>
                </div>
              </div>

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
                <form action={saveNotificationChannel} className="space-y-4">
                  <div>
                    <label
                      htmlFor="channel_id"
                      className="block text-sm font-medium text-slate-900 mb-2"
                    >
                      新しい通知先チャンネル
                    </label>
                    <select
                      id="channel_id"
                      name="channel_id"
                      defaultValue={workspace.notificationChannelId ?? ""}
                      required
                      className="w-full rounded-lg border border-input bg-background px-4 py-2 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
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
                  <div className="flex gap-3">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href="/settings">キャンセル</Link>
                    </Button>
                    <Button type="submit" className="flex-1">
                      保存
                      <ArrowRight />
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
