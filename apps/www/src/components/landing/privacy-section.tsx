import { CheckCircle } from "lucide-react";

const privacyFeatures = [
  {
    icon: (
      <svg
        className="h-6 w-6 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    title: "プライバシーに配慮した設計",
    description:
      "Slackに送られるのは、抽象的なサマリのみです。コードの全文、秘密鍵やトークン、エラーログの詳細は送信されません。",
    features: [
      "作業内容の要約のみを送信",
      "コード全文や機密情報は送信しない",
      "ブロッキング・休止の理由も概要のみ",
    ],
  },
  {
    icon: (
      <svg
        className="h-6 w-6 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
    ),
    title: "自分でコントロールできる自動化",
    description:
      "いつ報告するか、どの粒度で話すか、何を共有するかは自然言語でコントロールできます。プロンプト次第でルーチンも調整可能です。",
    features: [
      "報告のタイミングを自由に指定",
      "共有する情報の粒度を調整可能",
      "完全自動化ではない安心感",
    ],
  },
];

export function PrivacySection() {
  return (
    <section className="relative py-24 bg-gradient-to-br from-accent/20 via-slate-50 to-accent/20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-12 tracking-tight">
              プライバシー & コントロール
            </h2>
            <p className="text-xl w-full block text-slate-600 max-w-2xl">
              プライバシーを守りながら、自分のペースでコントロールできる進捗共有を実現します。
            </p>
          </div>
          <div className="space-y-12">
            {privacyFeatures.map((feature) => (
              <div key={feature.title} className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div className="pl-16 space-y-3">
                  {feature.features.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-slate-700">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-base">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
