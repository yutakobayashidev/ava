import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/clients/drizzle";
import { getSlackInstallConfig } from "@/lib/slackInstall";
import { getCurrentSession } from "@/lib/session";
import { createWorkspaceRepository } from "@/repos";

type SearchParams = {
  installed?: string;
  team?: string;
  error?: string;
};

export default async function SlackInstallPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await getCurrentSession();
  if (!user) {
    return redirect("/login?callbackUrl=/slack/install");
  }

  const params = await searchParams;
  const config = getSlackInstallConfig();
  const workspaceRepository = createWorkspaceRepository({ db });
  const [membership] = await workspaceRepository.listWorkspacesForUser({
    userId: user.id,
    limit: 1,
  });
  const workspace = membership?.workspace;

  const statusMessage = (() => {
    if (params.installed === "1") {
      return `Slackボットをインストールしました (${
        params.team ?? "workspace"
      })`;
    }
    if (params.error) {
      return `エラー: ${params.error}`;
    }
    return null;
  })();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-xl w-full space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Slackボットのインストール
          </h1>
          <p className="text-gray-600 text-sm">
            Slackログイン済みのワークスペースにボット権限を追加して、タスク通知を自動化します。
          </p>
        </header>

        {statusMessage ? (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900">
            {statusMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">ボットをインストール</p>
            <p className="text-sm text-gray-600">
              必要なスコープ: {config.scopes.join(", ")}
            </p>
          </div>
          <Link
            href="/slack/install/start"
            className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition"
          >
            Slackで認可
          </Link>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-2">
          <p className="font-medium text-gray-900">現在の接続状況</p>
          {workspace ? (
            <div className="text-sm text-gray-700 space-y-1">
              <p>ワークスペース: {workspace.name}</p>
              <p>ドメイン: {workspace.domain ?? "未取得"}</p>
              <p>bot user ID: {workspace.botUserId ?? "未設定"}</p>
              <p>
                bot token: {workspace.botAccessToken ? "保存済み" : "未保存"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              まだSlackワークスペースは連携されていません。
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
