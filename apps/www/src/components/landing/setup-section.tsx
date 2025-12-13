import { siteConfig } from "@/config/site";

type StepProps = {
  number: string;
  title: string;
  description: string;
};

function Step({ number, title, description }: StepProps) {
  return (
    <div className="flex gap-6">
      <div className="shrink-0">
        <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl">
          {number}
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

const steps = [
  {
    number: "1",
    title: "Slackワークスペースを連携",
    description:
      "Slackでアプリをインストールし、通知チャンネルを選択。スレッドでの投稿を確認しながら、いつでも人が介入できます。",
  },
  {
    number: "2",
    title: "MCPサーバーを接続",
    description: `お使いのコーディングエージェントに${siteConfig.name}のMCPサーバーを追加。設定は1行、すぐに始められます。`,
  },
  {
    number: "3",
    title: "コーディング開始",
    description:
      "あとはいつも通りコードを書く。エージェントがすべてのタスク更新を静かにSlackに同期し、必要なときだけ声をかけられる状態を保ちます。",
  },
];

export function SetupSection() {
  return (
    <section className="bg-slate-50 border-t border-slate-200 py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              静かに始める3ステップ
            </h2>
            <p className="text-xl text-slate-600">
              少しの設定で、進捗共有をやさしく自動化。
            </p>
          </div>
          <div className="space-y-8">
            {steps.map((step) => (
              <Step
                key={step.number}
                number={step.number}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
