import { db } from "@/clients/drizzle";
import { Header } from "@/components/header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { slackConfig } from "@/lib/slackInstall";
import { getSlackStatusMessage, isSuccessMessage } from "@/lib/slackMessages";
import { absoluteUrl } from "@/lib/utils";
import {
  createWorkspaceRepository,
  createGoogleDriveConnectionRepository,
} from "@/repos";
import { Settings, Slack, Terminal, FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { McpSetupTabs } from "../onboarding/setup-mcp/McpSetupTabs";

export const metadata: Metadata = {
  title: "設定",
  description: "MCP設定とSlack Bot連携の管理",
};

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const { user } = await requireAuth();
  const params = await searchParams;
  const workspaceRepository = createWorkspaceRepository({ db });
  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

  const googleDriveRepository = createGoogleDriveConnectionRepository({ db });
  const googleDriveConnection =
    await googleDriveRepository.findConnectionByUserId(user.id);

  const statusMessage = getSlackStatusMessage(params);
  const isSuccess = isSuccessMessage(params);

  const mcpUrl = absoluteUrl("/mcp");

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} className="bg-slate-50" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-slate-900" />
            <h1 className="text-4xl font-bold text-slate-900">設定</h1>
          </div>
          <p className="text-slate-600">MCP設定とSlack Bot連携を管理できます</p>
        </div>

        {statusMessage && (
          <Alert
            variant={isSuccess ? "default" : "destructive"}
            className="mb-6"
          >
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* MCP設定セクション */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                MCPサーバー設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                コーディングエージェントにAvaを追加して、進捗を記録・共有するツールとして利用できます。
              </p>

              <McpSetupTabs mcpUrl={mcpUrl} />
            </CardContent>
          </Card>

          {/* Slack Bot設定セクション */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Slack className="h-5 w-5" />
                Slack Bot連携
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Slackワークスペースにボット権限を追加して、タスク通知を自動化します。
              </p>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">接続状態</p>
                    {workspace?.botAccessToken ? (
                      <p className="text-sm text-emerald-600 font-medium">
                        接続済み
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">未接続</p>
                    )}
                  </div>
                  <div>
                    {workspace?.botAccessToken ? (
                      <Badge variant="default">アクティブ</Badge>
                    ) : (
                      <Badge variant="secondary">未設定</Badge>
                    )}
                  </div>
                </div>

                {workspace && (
                  <div className="border-t border-slate-200 pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500">ワークスペース</p>
                        <p className="font-medium text-slate-900">
                          {workspace.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">ドメイン</p>
                        <p className="font-medium text-slate-900">
                          {workspace.domain ?? "未取得"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Bot User ID</p>
                        <p className="font-mono text-xs text-slate-900">
                          {workspace.botUserId ?? "未設定"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">通知チャンネル</p>
                        <p className="font-mono text-xs text-slate-900">
                          {workspace.notificationChannelId ?? "未設定"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">
                      ボット権限の管理
                    </p>
                    <p className="text-xs text-slate-600">
                      必要なスコープ: {slackConfig.scopes.join(", ")}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/api/slack/install/start">
                      {workspace?.botAccessToken
                        ? "再インストール"
                        : "インストール"}
                    </Link>
                  </Button>
                </div>

                {workspace?.botAccessToken && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">
                        通知チャンネルの設定
                      </p>
                      <p className="text-xs text-slate-600">
                        タスク通知を送信するチャンネルを選択
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href="/settings/channel">チャンネル変更</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Google Drive連携セクション */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Google Drive連携
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Google Driveに接続して、ジャーナルを自動エクスポートできます。
              </p>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">接続状態</p>
                    {googleDriveConnection ? (
                      <p className="text-sm text-emerald-600 font-medium">
                        接続済み
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">未接続</p>
                    )}
                  </div>
                  <div>
                    {googleDriveConnection ? (
                      <Badge variant="default">アクティブ</Badge>
                    ) : (
                      <Badge variant="secondary">未設定</Badge>
                    )}
                  </div>
                </div>

                {googleDriveConnection && (
                  <div className="border-t border-slate-200 pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500">Googleアカウント</p>
                        <p className="font-medium text-slate-900">
                          {googleDriveConnection.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">接続日時</p>
                        <p className="text-xs text-slate-900">
                          {new Date(
                            googleDriveConnection.connectedAt,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">
                      アカウントの管理
                    </p>
                    <p className="text-xs text-slate-600">
                      Google Driveへのアクセスを許可
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/api/google-drive/connect/start">
                      {googleDriveConnection ? "再接続" : "接続"}
                    </Link>
                  </Button>
                </div>

                {googleDriveConnection && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">
                        ジャーナルのエクスポート
                      </p>
                      <p className="text-xs text-slate-600">
                        本日のタスクをGoogle Driveにエクスポート
                      </p>
                    </div>
                    <form
                      action="/api/google-drive/export/journal"
                      method="POST"
                    >
                      <Button type="submit" variant="outline">
                        今すぐエクスポート
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
