import { Card } from "@/components/ui/card";

const dashboardFeatures = [
  {
    icon: (
      <svg
        className="h-6 w-6 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    title: "タスクダッシュボード",
    description:
      "すべてのタスクの状態、開始・完了日時、所要時間を一覧表示。進行中・ブロック中・完了のステータスを即座に把握できます。",
    features: [
      "タスク一覧と詳細サマリ",
      "ステータスバッジで状態を可視化",
      "所要時間の自動計算",
    ],
  },
  {
    icon: (
      <svg
        className="h-6 w-6 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    title: "1日の自動まとめ",
    description:
      "ボタン一つで、今日完了・進行中・ブロック中のタスクをAIが要約。完了タスクの成果、所要時間、未解決の課題を含めてSlackへ自動投稿。",
    features: [
      "AIによる自然な文章生成",
      "完了タスクとPRの自動列挙",
      "ブロッキング課題の明記",
    ],
  },
];

export function DashboardSection() {
  return (
    <section className="border-t border-slate-200 py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              いつでも振り返る
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              ダッシュボードで全タスクの進捗と所要時間を一覧表示。ワンクリックで1日の業務まとめをAIが生成し、Slackへ自動投稿。
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {dashboardFeatures.map((feature) => (
              <Card key={feature.title} className="p-8 gap-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="space-y-2 pt-2">
                    {feature.features.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
