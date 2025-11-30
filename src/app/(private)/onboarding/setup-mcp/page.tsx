import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { absoluteUrl } from "@/lib/utils";
import { db } from "@/clients/drizzle";
import { CopyButton } from "./CopyButton";
import { OnboardingProgress } from "../OnboardingProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { McpSetupTabs } from "./McpSetupTabs";
import { requireAuth } from "@/lib/auth";
import { createWorkspaceRepository } from "@/repos";

export const metadata: Metadata = {
  title: "MCPサーバーを接続",
  description:
    "コーディングエージェントにAvaを追加して、自動タスク管理を有効化します。",
};

export default async function SetupMcpPage() {
  const { user } = await requireAuth();

  const workspaceRepository = createWorkspaceRepository({ db });
  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

  // Slack未連携の場合は戻す
  if (!workspace?.botAccessToken) {
    redirect("/onboarding/connect-slack");
  }

  const mcpConfig = {
    mcpServers: {
      ava: {
        type: "http",
        url: absoluteUrl("/mcp"),
      },
    },
  };

  const configJson = JSON.stringify(mcpConfig, null, 2);

  return (
    <div className="min-h-screen bg-slate-50">
      <OnboardingProgress currentStep={2} />

      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">
              MCPサーバーを接続
            </h1>
            <p className="mt-3 text-slate-600">
              コーディングエージェントにAvaを追加して、自動タスク管理を有効化します。
            </p>
          </div>

          <Card>
            <CardContent className="space-y-6">
              <McpSetupTabs />

              <div className="space-y-4">
                <div className="relative rounded-lg bg-slate-900 p-4">
                  <CopyButton text={configJson} />
                  <pre className="overflow-x-auto text-sm text-slate-100">
                    <code>{configJson}</code>
                  </pre>
                </div>

                <p className="text-sm text-muted-foreground">
                  上記の設定を、選択したエディタの指定された場所に配置してください。
                </p>
              </div>

              <div className="flex justify-center">
                <Button asChild size="lg">
                  <Link href="/onboarding/complete">
                    次へ
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
