import { Badge } from "@/components/ui/badge";

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

const problemPoints = [
  "タスク開始・進捗・ブロッカー・完了を自動でSlackへ",
  "コードを書くことに集中、報告文を考える時間はゼロに",
  "チームは進捗を把握でき、必要なときだけサポート",
  "エージェントが働いた履歴を、そのまま成果として共有",
];

function ProblemRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
      <p className="text-lg text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}

export function SlackDemoSection() {
  return (
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
              {problemPoints.map((text) => (
                <ProblemRow key={text} text={text} />
              ))}
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
  );
}
