import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-24 md:py-32">
      <div className="max-w-5xl mx-auto text-center">
        <Badge
          variant="secondary"
          className="mb-8 px-4 py-2 text-sm border-transparent"
        >
          <Zap className="h-4 w-4" />
          静かに寄り添う進捗共有
        </Badge>
        <h1 className="text-6xl md:text-8xl font-bold text-slate-900 mb-6 tracking-tight">
          Quiet Progress.
          <span className="block text-primary mt-2">Gentle Updates.</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          コンテキストスイッチを減らし、報告文をひねり出す痛みから解放。コーディングエージェントが静かにSlackスレッドへ進捗をまとめ、人が必要ならすぐ手を差し伸べられます。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/api/auth/slack">
              Slackでログイン
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/docs">ドキュメントを見る</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
