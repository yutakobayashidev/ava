import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { db } from "@ava/database/client";
import { createWorkspaceRepository } from "@/repos";
import { users } from "@ava/database/schema";
import { eq } from "drizzle-orm";
import { OnboardingProgress } from "../OnboardingProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "準備完了",
  description:
    "セットアップが完了しました。コーディングを始めると、自動でSlackに進捗が投稿されます。",
};

export default async function CompletePage() {
  const { user } = await requireAuth();

  const workspaceRepository = createWorkspaceRepository({ db });
  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

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
    <div className="min-h-screen bg-slate-50">
      <OnboardingProgress currentStep={3} />

      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-8">
          <div className="text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">準備完了</h1>
            <p className="mt-3 text-slate-600">
              セットアップが完了しました。コーディングを始めると、自動でSlackに進捗が投稿されます。
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>接続中のワークスペース</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4">
                <p className="font-medium">{workspace.name}</p>
                {workspace.domain && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {workspace.domain}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>次のステップ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    1
                  </span>
                  <p>普段通りにコードを書く</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    2
                  </span>
                  <p>エージェントが自動的に進捗をSlackに投稿</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    3
                  </span>
                  <p>チームは質問なしで状況を把握</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    ダッシュボードへ
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/docs">ドキュメントを見る</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
