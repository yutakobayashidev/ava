import { db } from "@/clients/drizzle";
import { requireWorkspace } from "@/lib/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default async function BillingSuccessPage() {
  const { user } = await requireWorkspace(db);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} className="bg-slate-50" />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-900">
              サブスクリプションの登録が完了しました
            </CardTitle>
            <CardDescription className="text-green-700">
              ご登録ありがとうございます！すべての機能をご利用いただけます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">次のステップ</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">1.</span>
                  <span>
                    MCPサーバーを設定して、Claude
                    Codeからタスクを管理できるようにします
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">2.</span>
                  <span>
                    Slack連携を設定して、チームへの進捗共有を自動化します
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">3.</span>
                  <span>
                    ダッシュボードでタスクの進捗と所要時間を確認できます
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild className="flex-1">
                <Link href="/onboarding/setup-mcp">MCP設定を開始</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/dashboard">ダッシュボードへ</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
