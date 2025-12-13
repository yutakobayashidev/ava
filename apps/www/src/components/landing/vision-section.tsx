import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const features = [
  {
    title: "コンテキストスイッチに優しく",
    description:
      "差し込みや注意の散漫さで流れが切れても大丈夫。AIが静かに進捗を拾い上げ、あとから振り返れるように残します。",
  },
  {
    title: "プロセスが伝わる安心",
    description:
      "すべてのステップが静かに共有され、最終成果物だけでなくプロセスも正当に伝わります。沈黙が不安に変わりません。",
  },
  {
    title: "報告文の苦痛から解放",
    description:
      "「いま何を書けば？」と悩む時間を削減。AIが言語化を手伝い、集中を妨げずにチームへ状況を伝えられます。",
  },
  {
    title: "必要なときだけ声をかけられる",
    description:
      "Slackのスレッドに静かに積み上がるので、過度なチェックインは不要。必要なときだけ人が介入し、やさしくサポートできます。",
  },
];

export function VisionSection() {
  return (
    <section className="border-t border-slate-200 py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
              安心して集中できる仕組みを
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              コーディングエージェントが思考の外部化を手伝い、静かに深呼吸してコードに集中できます。Slackのスレッドでは、必要なときだけ人がやさしく介入できます。
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="flex-row items-start gap-4 p-6">
                <div className="shrink-0 w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
