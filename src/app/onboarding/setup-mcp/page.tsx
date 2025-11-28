import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Terminal, CheckCircle, AlertCircle } from "lucide-react";
import { getCurrentSession } from "@/src/lib/session";
import { db } from "@/src/clients/drizzle";
import { createWorkspaceRepository } from "@/src/repos";
import { CopyButton } from "./CopyButton";

export default async function SetupMcpPage() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login?callbackUrl=/onboarding/setup-mcp");
  }

  const workspaceRepository = createWorkspaceRepository({ db });
  const [workspace] = await workspaceRepository.listWorkspaces({ limit: 1 });

  // Slack未連携の場合は戻す
  if (!workspace?.botAccessToken) {
    redirect("/onboarding/connect-slack");
  }

  const mcpConfig = {
    mcpServers: {
      task: {
        type: "http",
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/mcp",
      },
    },
  };

  const configJson = JSON.stringify(mcpConfig, null, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="font-medium text-slate-600">Slack連携</span>
            </div>
            <div className="h-1 flex-1 mx-4 bg-green-600 rounded"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <span className="font-semibold text-slate-900">MCP接続</span>
            </div>
            <div className="h-1 flex-1 mx-4 bg-slate-200 rounded">
              <div className="h-full w-2/3 bg-blue-600 rounded"></div>
            </div>
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
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              MCPサーバーを接続
            </h1>
            <p className="text-xl text-slate-600">
              コーディングエージェントにAI Task Managerを追加して、自動タスク管理を有効化
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Terminal className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  プロジェクトの設定
                </h2>
                <p className="text-slate-600">
                  以下の設定をプロジェクトのルートディレクトリに <code className="px-2 py-1 bg-slate-100 rounded text-sm">.mcp.json</code> として保存してください
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 mb-6 relative group">
              <CopyButton text={configJson} />
              <pre className="text-sm text-slate-100 overflow-x-auto">
                <code>{configJson}</code>
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">設定ファイルの場所</h3>
              <p className="text-sm text-blue-800">
                プロジェクトのルートディレクトリ（例: <code className="bg-blue-100 px-2 py-0.5 rounded">~/your-project/.mcp.json</code>）に配置してください
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-slate-900">セットアップ手順</h3>
              <ol className="space-y-3 text-slate-700">
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <span>上記の設定をコピー</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <span>プロジェクトのルートディレクトリに <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">.mcp.json</code> ファイルを作成して貼り付け</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <span>Claude Codeでプロジェクトを開く</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  <span>初回接続時にブラウザでOAuth認証が求められるので承認</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    5
                  </span>
                  <span>MCPツールが利用可能になったことを確認</span>
                </li>
              </ol>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                初回接続について
              </h3>
              <p className="text-sm text-amber-800">
                MCPサーバーに初めて接続する際、ブラウザが開いてOAuth認証画面が表示されます。
                「Allow」をクリックしてAI Task Managerへのアクセスを許可してください。
              </p>
            </div>

            <Link
              href="/onboarding/complete"
              className="w-full inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              設定完了
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>

          <div className="text-center text-sm text-slate-500">
            <p>所要時間: 約1分</p>
          </div>
        </div>
      </div>
    </div>
  );
}
