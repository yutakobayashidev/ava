import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="bg-slate-900 text-white py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            静かな伴走で、進捗を届けませんか？
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto">
            注意が散漫になる日や、報告文を書く気力が湧かない日も大丈夫。AIがSlackスレッドに進捗を積み上げ、必要なら人がすぐ寄り添えます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="px-8 py-4 shadow-lg hover:shadow-xl rounded-xl h-auto"
            >
              <Link href="/api/auth/slack">
                無料で始める
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/docs">ドキュメントを見る</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
