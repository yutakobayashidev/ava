import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  MessageSquare,
  GitPullRequest,
  AlertCircle,
  Zap,
} from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { Header } from "@/components/header";

export default async function LandingPage() {
  const { user } = await getCurrentSession();

  // オンボーディング完了済みのユーザーはダッシュボードへ
  if (user?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      <Header user={user} />
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-5xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-8 px-4 py-2 text-sm bg-blue-50 text-blue-700 border-transparent"
          >
            <Zap className="h-4 w-4" />
            静かに寄り添う進捗共有
          </Badge>
          <h1 className="text-6xl md:text-8xl font-bold text-slate-900 mb-6 tracking-tight">
            Quiet Progress.
            <span className="block text-blue-600 mt-2">Gentle Updates.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            コンテキストスイッチを減らし、報告文をひねり出す痛みから解放。コーディングエージェントが静かにSlackスレッドへ進捗をまとめ、人が必要ならすぐ手を差し伸べられます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl rounded-xl h-auto"
            >
              <Link href="/login">
                Slackでログイン
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-8 py-4 border-2 rounded-xl h-auto"
            >
              <Link href="/docs">ドキュメントを見る</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Vision Section */}
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
              <Card className="flex-row items-start gap-4 p-6">
                <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    コンテキストスイッチに優しく
                  </h3>
                  <p className="text-slate-600">
                    差し込みや注意の散漫さで流れが切れても大丈夫。AIが静かに進捗を拾い上げ、あとから振り返れるように残します。
                  </p>
                </div>
              </Card>
              <Card className="flex-row items-start gap-4 p-6">
                <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    プロセスが伝わる安心
                  </h3>
                  <p className="text-slate-600">
                    すべてのステップが静かに共有され、最終成果物だけでなくプロセスも正当に伝わります。沈黙が不安に変わりません。
                  </p>
                </div>
              </Card>
              <Card className="flex-row items-start gap-4 p-6">
                <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    報告文の苦痛から解放
                  </h3>
                  <p className="text-slate-600">
                    「いま何を書けば？」と悩む時間を削減。AIが言語化を手伝い、集中を妨げずにチームへ状況を伝えられます。
                  </p>
                </div>
              </Card>
              <Card className="flex-row items-start gap-4 p-6">
                <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    必要なときだけ声をかけられる
                  </h3>
                  <p className="text-slate-600">
                    Slackのスレッドに静かに積み上がるので、過度なチェックインは不要。必要なときだけ人が介入し、やさしくサポートできます。
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="bg-gradient-to-b from-slate-50 via-white to-slate-50 py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-relaxed">
                エージェントでコンテキストスイッチを削減
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                AIエージェントとコーディングするだけで、
                進捗管理もエージェントに任せて、開発に集中できます。
              </p>
              <div className="space-y-4">
                <ProblemRow text="タスク開始・進捗・ブロッカー・完了を自動でSlackへ" />
                <ProblemRow text="コードを書くことに集中、報告文を考える時間はゼロに" />
                <ProblemRow text="チームは進捗を把握でき、必要なときだけサポート" />
                <ProblemRow text="エージェントが働いた履歴を、そのまま成果として共有" />
              </div>
            </div>
            <div className="relative">
              <div
                className="absolute inset-0 blur-3xl bg-gradient-to-br from-blue-100 via-white to-teal-100 rounded-3xl"
                aria-hidden
              />
              <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-semibold">
                      AI
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Slack Thread</p>
                      <p className="font-semibold text-slate-900">
                        #dev-updates
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: "APIエンドポイント統合作業",
                      desc: "進捗まとめと懸念をスレッドに記録しました。",
                      time: "10:12",
                      tone: "bg-blue-50 text-blue-800",
                    },
                    {
                      title: "ブロッカー: テスト用認証ヘッダー",
                      desc: "ベンチトークンがエラー。サンプルを共有いただけると助かります。",
                      time: "11:04",
                      tone: "bg-orange-50 text-orange-800",
                    },
                    {
                      title: "PR ready for review",
                      desc: "Slack通知→GitHub自動連携。レビュー依頼のみ人が介入。",
                      time: "12:48",
                      tone: "bg-emerald-50 text-emerald-800",
                    },
                  ].map((item) => (
                    <Card
                      key={item.title}
                      className="rounded-2xl p-4 bg-slate-50/80 gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-xs font-semibold px-2.5 py-1 border-transparent ${item.tone}`}
                        >
                          {item.time}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {item.desc}
                      </p>
                    </Card>
                  ))}
                </div>
                <Card className="rounded-2xl bg-slate-50 p-4 flex-row items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                    PM
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      マネージャー
                    </p>
                    <p className="text-sm text-slate-600">
                      スレッド見ました。サンプルヘッダー送ります、他に必要な情報あれば教えてください。
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
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
              <FlowCard
                icon={<MessageSquare className="h-5 w-5 text-blue-700" />}
                title="タスク開始"
                dotClass="bg-blue-600"
                description="エージェントがタスク開始とコンテキストをSlackスレッドへ。チームは静かに状況を把握。"
              />
              <FlowCard
                icon={<ArrowRight className="h-5 w-5 text-blue-700" />}
                title="進捗更新"
                dotClass="bg-blue-600"
                description="細かな進捗も自動で積み上がり、報告文を考える負担を軽減。必要なときだけ人が返信。"
              />
              <FlowCard
                icon={<AlertCircle className="h-5 w-5 text-blue-700" />}
                title="ブロック報告"
                dotClass="bg-blue-600"
                description="詰まりは同じスレッドに即通知。気まずいお願いなしで、メンバーがそのままフォロー。"
              />
              <FlowCard
                icon={<GitPullRequest className="h-5 w-5 text-blue-700" />}
                title="タスク完了"
                dotClass="bg-blue-600"
                description="完了とPRをまとめて投稿。静かな進行を保ったまま、レビュー待ちもスムーズに。"
                isLast
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard & Summary Section */}
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
              <Card className="p-8 gap-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-blue-600"
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
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    タスクダッシュボード
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    すべてのタスクの状態、開始・完了日時、所要時間を一覧表示。進行中・ブロック中・完了のステータスを即座に把握できます。
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      タスク一覧と詳細サマリ
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      ステータスバッジで状態を可視化
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      所要時間の自動計算
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-8 gap-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-blue-600"
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
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    1日の自動まとめ
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    ボタン一つで、今日完了・進行中・ブロック中のタスクをAIが要約。完了タスクの成果、所要時間、未解決の課題を含めてSlackへ自動投稿。
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      AIによる自然な文章生成
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      完了タスクとPRの自動列挙
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      ブロッキング課題の明記
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Control Section */}
      <section className="relative py-24 bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 overflow-hidden">
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
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
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
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      プライバシーに配慮した設計
                    </h3>
                    <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                      Slackに送られるのは、抽象的なサマリのみです。コードの全文、秘密鍵やトークン、エラーログの詳細は送信されません。
                    </p>
                  </div>
                </div>
                <div className="pl-16 space-y-3">
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-base">作業内容の要約のみを送信</span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-base">
                      コード全文や機密情報は送信しない
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-base">
                      詰まり・休止の理由も概要のみ
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
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
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      自分でコントロールできる自動化
                    </h3>
                    <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                      いつ報告するか、どの粒度で話すか、何を共有するかは自然言語でコントロールできます。プロンプト次第でルーチンも調整可能です。
                    </p>
                  </div>
                </div>
                <div className="pl-16 space-y-3">
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-base">
                      報告のタイミングを自由に指定
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-base">
                      共有する情報の粒度を調整可能
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-base">完全自動化ではない安心感</span>
                  </div>
                </div>
              </div>
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
                静かに始める3ステップ
              </h2>
              <p className="text-xl text-slate-600">
                少しの設定で、進捗共有をやさしく自動化。
              </p>
            </div>
            <div className="space-y-8">
              <Step
                number="1"
                title="Slackワークスペースを連携"
                description="Slackでアプリをインストールし、通知チャンネルを選択。スレッドでの投稿を確認しながら、いつでも人が介入できます。"
              />
              <Step
                number="2"
                title="MCPサーバーを接続"
                description={`お使いのコーディングエージェントに${siteConfig.name}のMCPサーバーを追加。設定は1行、すぐに始められます。`}
              />
              <Step
                number="3"
                title="コーディング開始"
                description="あとはいつも通りコードを書く。エージェントがすべてのタスク更新を静かにSlackに同期し、必要なときだけ声をかけられる状態を保ちます。"
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
              静かな伴走で、進捗を届けませんか？
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto">
              注意が散漫になる日や、報告文を書く気力が湧かない日も大丈夫。AIがSlackスレッドに進捗を積み上げ、必要なら人がすぐ寄り添えます。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl rounded-xl h-auto"
              >
                <Link href="/login">
                  無料で始める
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl h-auto text-white hover:text-white"
              >
                <Link href="/docs">ドキュメントを見る</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm">
              &copy; 2025 {siteConfig.name}. Built for deep work.
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/docs" className="hover:text-white transition-colors">
                ドキュメント
              </Link>
              <a href="#" className="hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-white transition-colors">
                サポート
              </a>
            </div>
          </div>
        </div>
      </footer>
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

function FlowCard({
  icon,
  title,
  description,
  dotClass,
  isLast = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  dotClass: string;
  isLast?: boolean;
}) {
  return (
    <div className="relative pl-12 pb-10 last:pb-0">
      {!isLast && (
        <div
          className="absolute left-[6px] top-4 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent"
          aria-hidden
        />
      )}
      <div
        className={`absolute left-0 top-2 h-4 w-4 rounded-full border-2 border-white shadow-sm ${dotClass}`}
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

function ProblemRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-600 mt-2.5" />
      <p className="text-lg text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}
