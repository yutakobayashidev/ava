import Link from "next/link";
import { ArrowRight, CheckCircle, MessageSquare, GitPullRequest, AlertCircle, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            Stop context switching. Start shipping.
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-slate-900 mb-6 tracking-tight">
            Code in Flow.
            <span className="block text-blue-600 mt-2">AI Handles the Rest.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            集中作業に最適化されたタスク管理。コーディングエージェントが自動的に進捗をSlackに同期—コンテキストスイッチ不要。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              無料で始める
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="https://github.com"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              GitHubで見る
            </a>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="border-t border-slate-200 py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
                Built for Deep Work
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                AIが進捗報告を自動化。あなたはフロー状態を保ったまま、コードに集中できます。
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No Context Switching</h3>
                  <p className="text-slate-600">コードに集中したまま、AIが自動的にチームへ進捗を伝達します。</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Process Transparency</h3>
                  <p className="text-slate-600">すべてのステップが記録・共有され、最終成果物だけでなくプロセスも正当に評価されます。</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Trust by Default</h3>
                  <p className="text-slate-600">沈黙は停滞を意味しません。自動更新により、集中を妨げずにチームへ状況を伝えられます。</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No Micromanagement</h3>
                  <p className="text-slate-600">透明性の高い可視化により、頻繁な確認会議が不要になります。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="bg-slate-50 py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                The Cost of Context Switching
              </h2>
              <p className="text-xl text-slate-600">
                進捗報告のたびに集中が途切れる。その代償は思っているより大きい。
              </p>
            </div>
            <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">こんな経験はありませんか？</h3>
              <ul className="space-y-4 text-slate-700">
                <li className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-slate-400 shrink-0 mt-1" />
                  <span>フロー状態でコードを書いていたら、気づいたら数時間経っていて報告を忘れていた</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-slate-400 shrink-0 mt-1" />
                  <span>進捗報告の文章を書く方が、コードを書くより難しく感じる</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-slate-400 shrink-0 mt-1" />
                  <span>報告しないとチェックインされ、さらに集中が途切れる悪循環</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-slate-400 shrink-0 mt-1" />
                  <span>作業の可視性は欲しいけど、コミュニケーションのオーバーヘッドは避けたい</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                How It Works
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                コーディングエージェント + MCP + Slack = 何もしなくても自動で進捗報告
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <FeatureCard
                icon={<MessageSquare className="h-8 w-8 text-blue-600" />}
                title="タスク開始"
                description="コーディングエージェントがタスクを開始すると、コンテキスト、セッションID、初期アプローチとともに自動的にSlackへ投稿されます。"
              />
              <FeatureCard
                icon={<ArrowRight className="h-8 w-8 text-green-600" />}
                title="進捗更新"
                description="リアルタイムの進捗がSlackスレッドに同期されます。チームは聞かなくても状況を把握できます。"
              />
              <FeatureCard
                icon={<AlertCircle className="h-8 w-8 text-orange-600" />}
                title="ブロック報告"
                description="行き詰まったら、即座にチームへ通知。気まずいお願いなしで、サポートを得られます。"
              />
              <FeatureCard
                icon={<GitPullRequest className="h-8 w-8 text-purple-600" />}
                title="タスク完了"
                description="完了したら、PRが自動的にSlackへ共有されレビュー待ちに。より早く出荷、より少ないコミュニケーション。"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Setup Section */}
      <section className="bg-slate-50 border-t border-slate-200 py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                Get Started in Minutes
              </h2>
              <p className="text-xl text-slate-600">
                3つの簡単なステップで、コンテキストスイッチを永遠に排除
              </p>
            </div>
            <div className="space-y-8">
              <Step
                number="1"
                title="MCPサーバーを接続"
                description="お使いのコーディングエージェントにAI Task ManagerのMCPサーバーを追加。設定1行で完了。"
              />
              <Step
                number="2"
                title="Slackワークスペースを連携"
                description="OAuthで認証し、通知チャンネルを選択。30秒で完了。"
              />
              <Step
                number="3"
                title="コーディング開始"
                description="これだけ。エージェントがすべてのタスク更新を自動的にSlackに同期。もう二度と考える必要はありません。"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 text-white py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              Ready to Stop Context Switching?
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto">
              フロー状態でコードを書き続けながら、AIがコミュニケーションのオーバーヘッドを処理する開発者の仲間入りを。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                無料で始める
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="https://github.com"
                className="inline-flex items-center justify-center px-8 py-4 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all border border-slate-700"
              >
                ドキュメントを見る
              </a>
            </div>
            <p className="text-slate-400 mt-8">
              クレジットカード不要 • 個人開発者は無料
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm">
              &copy; 2025 AI Task Manager. Built for deep work.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">ドキュメント</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">サポート</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="shrink-0">
        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
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
