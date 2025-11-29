import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { db } from "@/clients/drizzle";
import { createWorkspaceRepository } from "@/repos";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OnboardingProgress } from "../OnboardingProgress";

export default async function CompletePage() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login?callbackUrl=/onboarding/complete");
  }

  const workspaceRepository = createWorkspaceRepository({ db });
  const [membership] = await workspaceRepository.listWorkspacesForUser({
    userId: user.id,
    limit: 1,
  });
  const workspace = membership?.workspace;

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
      <OnboardingProgress currentStep={3} />

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-blue-50 p-10 shadow-sm">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                <Sparkles className="h-9 w-9 text-green-600" />
              </div>
              <h1 className="text-5xl font-bold text-slate-900">準備完了!</h1>
              <p className="mt-3 text-xl text-slate-700">
                これでコンテキストスイッチから解放されます。チームへの報告はAIが自動で届けます。
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 font-medium shadow-sm">
                  自動進捗投稿が有効
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 font-medium shadow-sm">
                  Slackスレッドで透明性を維持
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
              <p className="text-sm text-slate-300">ワークスペース</p>
              <p className="text-xl font-bold">{workspace.name}</p>
              {workspace.domain && (
                <p className="mt-1 text-sm text-slate-400">
                  {workspace.domain}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  次のステップ
                </h2>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  利用開始
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-2xl border border-slate-100 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      コーディングエージェントでコーディング開始
                    </h3>
                    <p className="text-sm text-slate-600">
                      普段通りにコードを書くだけ。エージェントが自動的に進捗をSlackに投稿します。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-slate-100 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Slackで進捗を確認
                    </h3>
                    <p className="text-sm text-slate-600">
                      チームメンバーはSlackで自動更新を受け取り、質問なしで状況を把握できます。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-slate-100 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      フロー状態を維持
                    </h3>
                    <p className="text-sm text-slate-600">
                      報告のための中断がなくなり、深い集中を保ったまま開発を続けられます。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
                >
                  ダッシュボードへ
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex w-full items-center justify-center rounded-xl border-2 border-slate-200 px-8 py-4 text-center font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  ドキュメントを見る
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-500 shadow-sm backdrop-blur">
              進捗投稿はSlackのスレッドにまとまります。必要ならここから設定をいつでも編集できます。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
