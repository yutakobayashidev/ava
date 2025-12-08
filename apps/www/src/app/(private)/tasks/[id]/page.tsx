import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireWorkspace } from "@/lib/auth";
import { createTaskQueryRepository } from "@/repos";
import { formatDate, formatDuration } from "@/utils/date";
import { buildSlackThreadUrl } from "@/utils/slack";
import { db } from "@ava/database/client";
import {
  ArrowLeft,
  Calendar,
  Clock,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

function StatusBadge({ status }: { status: string }) {
  const variants = {
    in_progress: { variant: "default" as const, label: "進行中" },
    blocked: { variant: "destructive" as const, label: "ブロック中" },
    paused: { variant: "secondary" as const, label: "休止中" },
    completed: { variant: "secondary" as const, label: "完了" },
  };

  const config =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    variants[status as keyof typeof variants] || variants.in_progress;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function EventIcon({ eventType }: { eventType: string }) {
  switch (eventType) {
    case "started":
      return <div className="w-3 h-3 bg-blue-500 rounded-full" />;
    case "updated":
      return <div className="w-3 h-3 bg-green-500 rounded-full" />;
    case "blocked":
      return <div className="w-3 h-3 bg-red-500 rounded-full" />;
    case "block_resolved":
      return <div className="w-3 h-3 bg-yellow-500 rounded-full" />;
    case "paused":
      return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    case "resumed":
      return <div className="w-3 h-3 bg-green-500 rounded-full" />;
    case "completed":
      return <div className="w-3 h-3 bg-purple-500 rounded-full" />;
    default:
      return <div className="w-3 h-3 bg-gray-300 rounded-full" />;
  }
}

function EventTypeLabel({ eventType }: { eventType: string }) {
  const labels: Record<string, string> = {
    started: "開始",
    updated: "進捗更新",
    blocked: "ブロック",
    block_resolved: "ブロック解消",
    paused: "休止",
    resumed: "再開",
    completed: "完了",
  };

  return (
    <span className="font-medium text-slate-900">
      {labels[eventType] || eventType}
    </span>
  );
}

export default async function TaskDetailPage({
  params,
}: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const { user, workspace } = await requireWorkspace(db);

  const taskRepository = createTaskQueryRepository(db);
  const task = await taskRepository.findTaskSessionById(
    id,
    workspace.id,
    user.id,
  );

  if (!task) {
    notFound();
  }

  // イベントを取得
  const events = await taskRepository.listEvents({
    taskSessionId: id,
    limit: 100,
  });

  // 完了情報を取得
  let completedAt: Date | null = null;
  let completionSummary: string | null = null;
  let duration: number | null = null;

  if (task.status === "completed") {
    const completedEvent = await taskRepository.getLatestEvent({
      taskSessionId: id,
      eventType: "completed",
    });
    if (completedEvent) {
      completedAt = completedEvent.createdAt;
      completionSummary = completedEvent.summary;
      duration = completedAt.getTime() - task.createdAt.getTime();
    }
  }

  const slackThreadUrl = buildSlackThreadUrl({
    workspaceExternalId: workspace.externalId,
    workspaceDomain: workspace.domain,
    channelId: task.slackChannel,
    threadTs: task.slackThreadTs,
  });

  const slackChannelLabel =
    workspace.notificationChannelName ?? task.slackChannel ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} className="bg-slate-50" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">
              {task.issueTitle}
            </h1>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-slate-600">{task.initialSummary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                開始日時
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-slate-900">
                {formatDate(task.createdAt, true)}
              </p>
            </CardContent>
          </Card>

          {completedAt && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  完了日時
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDate(completedAt, true)}
                </p>
              </CardContent>
            </Card>
          )}

          {duration && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  所要時間
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDuration(duration)}
                </p>
              </CardContent>
            </Card>
          )}

          {task.issueId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Issue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-slate-900">
                  #{task.issueId}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mb-8">
          <CardHeader className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Slackスレッド
            </CardTitle>
            {slackThreadUrl && (
              <Button asChild variant="outline" size="sm">
                <Link href={slackThreadUrl} target="_blank" rel="noreferrer">
                  Slackで開く
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {slackThreadUrl ? (
              <div className="space-y-2 text-sm text-slate-600">
                {slackChannelLabel && (
                  <p className="font-medium text-slate-900">
                    投稿先: {slackChannelLabel}
                  </p>
                )}
                <p className="text-xs text-slate-500 break-all">
                  スレッドTS: {task.slackThreadTs}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Slackへのスレッド情報がまだありません。Slack通知が有効になるとここにリンクが表示されます。
              </p>
            )}
          </CardContent>
        </Card>

        {completionSummary && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>完了サマリ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">
                {completionSummary}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>イベントログ</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-slate-600 text-center py-8">
                イベントがありません
              </p>
            ) : (
              <div className="space-y-0">
                {events.map(
                  (
                    event: {
                      id: string;
                      eventType: string;
                      reason: string | null;
                      summary: string | null;
                      createdAt: Date;
                    },
                    index: number,
                  ) => (
                    <div
                      key={event.id}
                      className="flex gap-4 pb-6 relative"
                      style={{
                        paddingBottom:
                          index === events.length - 1 ? 0 : "1.5rem",
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <EventIcon eventType={event.eventType} />
                        {index !== events.length - 1 && (
                          <div className="flex-1 w-px bg-slate-200 mt-2" />
                        )}
                      </div>

                      <div className="flex-1 pt-0.5">
                        <div className="flex items-baseline gap-2 mb-1">
                          <EventTypeLabel eventType={event.eventType} />
                          <span className="text-sm text-slate-500">
                            {formatDate(event.createdAt, true)}
                          </span>
                        </div>

                        {event.reason && (
                          <p className="text-slate-600 text-sm mt-1">
                            理由: {event.reason}
                          </p>
                        )}

                        {event.summary && (
                          <p className="text-slate-700 mt-2 whitespace-pre-wrap">
                            {event.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
