import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { getCurrentSession } from "@/src/lib/session";
import { db } from "@/src/clients/drizzle";
import { createWorkspaceRepository } from "@/src/repos";
import { users } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export default async function CompletePage() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login?callbackUrl=/onboarding/complete");
  }

  const workspaceRepository = createWorkspaceRepository({ db });
  const [workspace] = await workspaceRepository.listWorkspaces({ limit: 1 });

  // Slack未連携の場合は戻す
  if (!workspace?.botAccessToken) {
    redirect("/onboarding/connect-slack");
  }

  // オンボーディング完了をマーク
  if (!user.onboardingCompletedAt) {
    await db
      .update(users)
      .set({ onboardingCompletedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
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
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="font-medium text-slate-600">MCP接続</span>
            </div>
            <div className="h-1 flex-1 mx-4 bg-green-600 rounded"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="font-semibold text-slate-900">完了</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <Sparkles className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-6xl font-bold text-slate-900 mb-4">
              準備完了!
            </h1>
            <p className="text-2xl text-slate-600">
              これでコンテキストスイッチから解放されます
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              次のステップ
            </h2>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Claude Codeでコーディング開始
                  </h3>
                  <p className="text-sm text-slate-600">
                    普段通りにコードを書くだけ。エージェントが自動的に進捗をSlackに投稿します
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <div className="shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Slackで進捗を確認
                  </h3>
                  <p className="text-sm text-slate-600">
                    チームメンバーはSlackで自動更新を受け取り、質問なしで状況を把握できます
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                <div className="shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    フロー状態を維持
                  </h3>
                  <p className="text-sm text-slate-600">
                    報告のための中断がなくなり、深い集中を保ったまま開発を続けられます
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="w-full inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                ダッシュボードへ
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-8 py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                ドキュメントを見る
              </a>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-6 text-center">
            <p className="text-sm mb-2 text-slate-300">ワークスペース</p>
            <p className="text-xl font-bold">{workspace.name}</p>
            {workspace.domain && (
              <p className="text-sm text-slate-400 mt-1">{workspace.domain}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
