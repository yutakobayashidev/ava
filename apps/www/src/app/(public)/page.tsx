import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getCurrentSession } from "@/lib/server/session";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  GitPullRequest,
  MessageSquare,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { user } = await getCurrentSession();

  // オンボーディング完了済みのユーザーはダッシュボードへ
  if (user?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  type ThreadMessage = {
    name: string;
    avatar: string;
    avatarBg: string;
    time: string;
    text: string;
    variant: string;
    status?: string;
    details?: { label: string; value: string }[];
    highlight?: string;
  };

  const threadMessages: ThreadMessage[] = [
    {
      name: "Ava (Agent)",
      avatar: "AI",
      avatarBg: "bg-slate-800",
      time: "10:12",
      status: "Task started",
      text: "タスクカードにチェックボックスを付け、完了状態を保存します。",
      variant: "start",
      details: [
        { label: "Started by", value: "@John Doe" },
        {
          label: "Summary",
          value:
            "チェックボックスで完了トグルを保存。PATCH /api/tasks/:id で completed と completed_at を扱えるようにする。",
        },
      ],
    },
    {
      name: "Ava (Agent)",
      avatar: "AI",
      avatarBg: "bg-slate-800",
      time: "10:54",
      status: "Update",
      text: "UIにチェックボックスを追加し、PATCH /api/tasks/:id で completed を更新。完了時はローカルで即反映するようにしました。",
      variant: "success",
    },
    {
      name: "Ava (Agent)",
      avatar: "AI",
      avatarBg: "bg-slate-800",
      time: "11:04",
      status: "BLOCKER",
      text: "完了時に completed_at を保存するか確認したいです。現状APIにはタイムスタンプのフィールドがありません。",
      variant: "blocker",
    },
    {
      name: "PM",
      avatar: "PM",
      avatarBg: "bg-blue-600",
      time: "11:20",
      status: "PM",
      text: "completed_atを追加で保存OKです。APIにもフィールドを追加して大丈夫です。",
      variant: "pm",
    },
    {
      name: "Ava (Agent)",
      avatar: "AI",
      avatarBg: "bg-slate-800",
      time: "12:10",
      status: "PR ready",
      text: "完了トグルと保存のPR作成。completed_atも保存する実装にしました。PR: https://github.com/example/repo/pull/301",
      variant: "success",
    },
  ];

  const badgeStyles: Record<string, string> = {
    start: "bg-slate-100 text-slate-800 border border-slate-200",
    blocker: "bg-amber-50 text-amber-800 border border-amber-100",
    success: "bg-slate-100 text-slate-800 border border-slate-200",
    pm: "bg-blue-50 text-blue-800 border border-blue-100",
  };

  return (
    <div className="min-h-screen bg-white">
      <Header user={user} />
      {/* Hero Section */}
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
                <div className="shrink-0 w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
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
                <div className="shrink-0 w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
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
                <div className="shrink-0 w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
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
                <div className="shrink-0 w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
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
                className="absolute inset-0 blur-3xl bg-slate-100/60 rounded-3xl"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-md bg-white">
                <div className="flex items-center px-6 py-4 border-b bg-white">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold">
                    #
                  </div>
                  <div className="ml-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                      Slack Thread
                    </p>
                    <p className="font-medium text-slate-900">#dev-updates</p>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 text-[12px] uppercase tracking-[0.08em] text-slate-500 border-b border-slate-200/70">
                  Today
                </div>
                <div className="relative px-6 py-5">
                  <div
                    className="absolute left-11 top-9 bottom-9 w-px bg-slate-200/30"
                    aria-hidden
                  />
                  <div className="space-y-5">
                    {threadMessages.map((message) => (
                      <div
                        key={`${message.name}-${message.time}`}
                        className="relative flex items-start gap-3"
                      >
                        <div
                          className={`w-10 h-10 rounded-md text-white font-semibold flex items-center justify-center ${message.avatarBg}`}
                        >
                          {message.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {message.name}
                            </p>
                            {message.status && (
                              <Badge
                                variant="secondary"
                                className={`text-[11px] font-medium border-0 ${badgeStyles[message.variant]}`}
                              >
                                {message.status}
                              </Badge>
                            )}
                            <span className="text-xs text-slate-500">
                              {message.time}
                            </span>
                          </div>
                          <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-800">
                            <p className="font-medium">{message.text}</p>
                            {message.details && (
                              <div className="space-y-1.5 text-xs text-slate-600">
                                {message.details.map((detail) => (
                                  <div
                                    key={`${detail.label}-${detail.value}`}
                                    className="flex gap-2"
                                  >
                                    <span className="font-medium text-slate-700 shrink-0">
                                      {detail.label}:
                                    </span>
                                    <span className="text-slate-700">
                                      {detail.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.highlight && (
                              <p className="text-slate-800 font-medium">
                                {message.highlight}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                icon={<MessageSquare className="h-5 w-5 text-primary" />}
                title="タスク開始"
                dotClass="bg-primary"
                description="エージェントがタスク開始とコンテキストをSlackスレッドへ。チームは静かに状況を把握。"
              />
              <FlowCard
                icon={<ArrowRight className="h-5 w-5 text-primary" />}
                title="進捗更新"
                dotClass="bg-primary"
                description="細かな進捗も自動で積み上がり、報告文を考える負担を軽減。必要なときだけ人が返信。"
              />
              <FlowCard
                icon={<AlertCircle className="h-5 w-5 text-primary" />}
                title="ブロック報告"
                dotClass="bg-primary"
                description="ブロッキングは同じスレッドに即通知。気まずいお願いなしで、メンバーがそのままフォロー。"
              />
              <FlowCard
                icon={<GitPullRequest className="h-5 w-5 text-primary" />}
                title="タスク完了"
                dotClass="bg-primary"
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
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
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
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    タスクダッシュボード
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    すべてのタスクの状態、開始・完了日時、所要時間を一覧表示。進行中・ブロック中・完了のステータスを即座に把握できます。
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      タスク一覧と詳細サマリ
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      ステータスバッジで状態を可視化
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      所要時間の自動計算
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-8 gap-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
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
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    1日の自動まとめ
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    ボタン一つで、今日完了・進行中・ブロック中のタスクをAIが要約。完了タスクの成果、所要時間、未解決の課題を含めてSlackへ自動投稿。
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      AIによる自然な文章生成
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      完了タスクとPRの自動列挙
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
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
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-base">作業内容の要約のみを送信</span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-base">
                      コード全文や機密情報は送信しない
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-base">
                      ブロッキング・休止の理由も概要のみ
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
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
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-base">
                      報告のタイミングを自由に指定
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-base">
                      共有する情報の粒度を調整可能
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
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

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="text-sm">
              &copy; 2025 {siteConfig.name}. Built for deep work.
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
              <Link href="/docs" className="hover:text-white transition-colors">
                ドキュメント
              </Link>
              <Link
                href="/docs/pricing"
                className="hover:text-white transition-colors"
              >
                料金
              </Link>
              <Link
                href="/docs/terms"
                rel="terms-of-service"
                className="hover:text-white transition-colors"
              >
                利用規約
              </Link>
              <Link
                href="/docs/privacy"
                rel="privacy-policy"
                className="hover:text-white transition-colors"
              >
                プライバシーポリシー
              </Link>
              <Link
                href="/docs/law"
                className="hover:text-white transition-colors"
              >
                特定商取引法に基づく表記
              </Link>
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                GitHub
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

function ProblemRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
      <p className="text-lg text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}
