import { AlertCircle, ArrowRight, GitPullRequest, MessageSquare } from "lucide-react";

type FlowCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  dotClass: string;
  isLast?: boolean;
};

function FlowCard({
  icon,
  title,
  description,
  dotClass,
  isLast = false,
}: FlowCardProps) {
  return (
    <div className="relative pl-12 pb-10 last:pb-0">
      {!isLast && (
        <div
          className="absolute left-[6px] top-4 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent"
          aria-hidden
        />
      )}
      <div
        className={`absolute left-0 top-2 h-4 w-4 rounded-full border-2 border-background shadow-sm ${dotClass}`}
      />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
            {icon}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

const flowSteps = [
  {
    icon: <MessageSquare className="h-5 w-5 text-primary" />,
    title: "タスク開始",
    description:
      "エージェントがタスク開始とコンテキストをSlackスレッドへ。チームは静かに状況を把握。",
  },
  {
    icon: <ArrowRight className="h-5 w-5 text-primary" />,
    title: "進捗更新",
    description:
      "細かな進捗も自動で積み上がり、報告文を考える負担を軽減。必要なときだけ人が返信。",
  },
  {
    icon: <AlertCircle className="h-5 w-5 text-primary" />,
    title: "ブロック報告",
    description:
      "ブロッキングは同じスレッドに即通知。気まずいお願いなしで、メンバーがそのままフォロー。",
  },
  {
    icon: <GitPullRequest className="h-5 w-5 text-primary" />,
    title: "タスク完了",
    description:
      "完了とPRをまとめて投稿。静かな進行を保ったまま、レビュー待ちもスムーズに。",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr,0.95fr] gap-12 items-start">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl mb-12 font-bold text-slate-900 tracking-tight">
              コードに集中、進捗は自動でデリバリー
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              Claude
              CodeやCursorなどのお使いのコーディングエージェントと一緒にコードを書くだけで、エージェントが進捗をやさしくスレッドに投稿し、人が必要ならその場でコメントして介入できます。
            </p>
          </div>
          <div className="space-y-0">
            {flowSteps.map((step, index) => (
              <FlowCard
                key={step.title}
                icon={step.icon}
                title={step.title}
                dotClass="bg-primary"
                description={step.description}
                isLast={index === flowSteps.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
