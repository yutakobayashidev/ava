import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Terminal, AlertCircle } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { db } from "@/clients/drizzle";
import { createWorkspaceRepository } from "@/repos";
import { CopyButton } from "./CopyButton";
import { OnboardingProgress } from "../OnboardingProgress";

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
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/mcp`,
      },
    },
  };

  const configJson = JSON.stringify(mcpConfig, null, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <OnboardingProgress currentStep={2} />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-blue-100 bg-white/70 p-8 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Step 2
              </p>
              <h1 className="mt-3 text-4xl font-bold text-slate-900">
                MCPサーバーを接続
              </h1>
              <p className="mt-3 text-lg text-slate-600">
                コーディングエージェントにAI Task
                Managerを追加して、自動タスク管理を有効化します。
                ローカルに設定ファイルを1つ置くだけのシンプルなステップです。
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                  所要時間 約1分
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium">
                  OAuth初回のみ
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                セットアップ手順
              </h3>
              <ol className="space-y-3 text-slate-700">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    1
                  </span>
                  <span>右側の設定をコピー</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    2
                  </span>
                  <span>
                    プロジェクトのルートディレクトリに{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                      .mcp.json
                    </code>{" "}
                    を作成して貼り付け
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    3
                  </span>
                  <span>Claude Codeでプロジェクトを開く</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    4
                  </span>
                  <span>
                    初回接続時にブラウザでOAuth認証が求められるので承認
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    5
                  </span>
                  <span>MCPツールが利用可能になったことを確認</span>
                </li>
              </ol>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
                  <AlertCircle className="h-5 w-5" />
                  初回接続について
                </div>
                <p className="text-sm text-amber-800">
                  MCPサーバーに初めて接続する際、ブラウザが開いてOAuth認証画面が表示されます。
                  「Allow」をクリックしてAI Task
                  Managerへのアクセスを許可してください。
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <Terminal className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    プロジェクトの設定
                  </h2>
                  <p className="text-slate-600">
                    以下の設定をプロジェクトのルートディレクトリに{" "}
                    <code className="rounded bg-slate-100 px-2 py-1 text-sm">
                      .mcp.json
                    </code>{" "}
                    として保存してください。
                  </p>
                </div>
              </div>

              <div className="relative mb-6 rounded-xl bg-slate-900 p-6">
                <CopyButton text={configJson} />
                <pre className="overflow-x-auto text-sm text-slate-100">
                  <code>{configJson}</code>
                </pre>
              </div>

              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-2 font-semibold text-blue-900">
                  設定ファイルの場所
                </h3>
                <p className="text-sm text-blue-800">
                  プロジェクトのルートディレクトリ（例:{" "}
                  <code className="rounded bg-blue-100 px-2 py-0.5">
                    ~/your-project/.mcp.json
                  </code>
                  ）に配置してください。
                </p>
              </div>

              <Link
                href="/onboarding/complete"
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
              >
                設定完了
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-500 shadow-sm backdrop-blur">
              このステップが終わると、タスクの開始・進捗・完了が自動でSlackに流れます。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
