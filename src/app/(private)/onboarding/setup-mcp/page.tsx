import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Terminal, AlertCircle } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { absoluteUrl } from "@/lib/utils";
import { db } from "@/clients/drizzle";
import { createWorkspaceRepository } from "@/repos";
import { CopyButton } from "./CopyButton";
import { OnboardingProgress } from "../OnboardingProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function SetupMcpPage() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login?callbackUrl=/onboarding/setup-mcp");
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

  const mcpConfig = {
    mcpServers: {
      task: {
        type: "http",
        url: absoluteUrl("/mcp"),
      },
    },
  };

  const configJson = JSON.stringify(mcpConfig, null, 2);

  return (
    <div className="min-h-screen bg-slate-50">
      <OnboardingProgress currentStep={2} />

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                MCPサーバーを接続
              </h1>
              <p className="mt-3 text-slate-600">
                コーディングエージェントにAvaを追加して、自動タスク管理を有効化します。
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                セットアップ手順
              </h2>
              <ol className="space-y-3 text-slate-600">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    1
                  </span>
                  <span>右側の設定をコピー</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    2
                  </span>
                  <span>
                    プロジェクトのルートに{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                      .mcp.json
                    </code>{" "}
                    を作成して貼り付け
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    3
                  </span>
                  <span>Claude Codeでプロジェクトを開く</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    4
                  </span>
                  <span>初回接続時に認証を承認</span>
                </li>
              </ol>
            </div>

            <Alert>
              <AlertCircle />
              <AlertTitle>初回接続について</AlertTitle>
              <AlertDescription>
                初回接続時にブラウザで認証が求められます。「Allow」をクリックしてアクセスを許可してください。
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Terminal className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>.mcp.json</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative rounded-lg bg-slate-900 p-4">
                  <CopyButton text={configJson} />
                  <pre className="overflow-x-auto text-sm text-slate-100">
                    <code>{configJson}</code>
                  </pre>
                </div>

                <p className="text-sm text-muted-foreground">
                  プロジェクトのルートディレクトリに配置してください。
                </p>

                <Button asChild className="w-full" size="lg">
                  <Link href="/onboarding/complete">
                    次へ
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
