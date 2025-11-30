import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Home, Search } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="p-12 text-center gap-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-accent/30 via-background to-accent/30 rounded-full" />
                <div className="relative w-32 h-32 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-6xl font-bold text-primary">404</span>
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              ページが見つかりません
            </h1>
            <p className="text-xl text-slate-600 max-w-md mx-auto leading-relaxed">
              お探しのページは存在しないか、移動または削除された可能性があります。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="px-6 py-3 shadow-lg hover:shadow-xl rounded-xl h-auto"
            >
              <Link href="/">
                <Home className="h-5 w-5" />
                ホームに戻る
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-6 py-3 border-2 rounded-xl h-auto"
            >
              <Link href="/docs">
                <Search className="h-5 w-5" />
                ドキュメントを見る
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              お困りの場合は、
              <Link
                href="/docs"
                className="text-primary hover:underline font-medium ml-1"
              >
                ドキュメント
              </Link>
              をご確認いただくか、
              <a
                href="https://github.com/yutakobayashidev/ai-task"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium ml-1"
              >
                GitHubでお問い合わせ
              </a>
              ください。
            </p>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              {siteConfig.name}のホームページへ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
