import { db } from "@/clients/drizzle";
import { createTaskRepository } from "@/repos";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/header";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { formatDate, formatDuration } from "@/utils/date";
import { requireWorkspace } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { buildSlackThreadUrl } from "@/utils/slack";

function StatusBadge({ status }: { status: string }) {
  const variants = {
    in_progress: { variant: "default" as const, label: "進行中" },
    blocked: { variant: "destructive" as const, label: "ブロック中" },
    completed: { variant: "secondary" as const, label: "完了" },
  };

  const config =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    variants[status as keyof typeof variants] || variants.in_progress;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspace(db);

  const taskRepository = createTaskRepository({ db });
  const tasks = await taskRepository.listTaskSessions({
    userId: user.id,
    workspaceId: workspace.id,
    limit: 100,
  });

  const tasksWithDuration = await Promise.all(
    tasks.map(async (task) => {
      let durationMs: number | null = null;
      let completedAt: Date | null = null;

      // 完了済みタスクのみ所要時間を計算
      if (task.status === "completed") {
        const completedEvent = await taskRepository.getLatestEvent({
          taskSessionId: task.id,
          eventType: "completed",
        });
        if (completedEvent) {
          completedAt = completedEvent.createdAt;
          durationMs = completedAt.getTime() - task.createdAt.getTime();
        }
      }

      return {
        ...task,
        completedAt,
        durationMs,
      };
    }),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} className="bg-slate-50" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-6">
            {workspace.iconUrl && (
              <Avatar className="size-20 rounded-lg">
                <AvatarImage src={workspace.iconUrl} alt={workspace.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(workspace.name)}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-1">
                Dashboard
              </h1>
              <p className="text-slate-600">
                {workspace.name} • タスクの進捗状況と所要時間を確認できます
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            タスク一覧
            <span className="ml-3 text-base font-normal text-slate-500">
              ({tasksWithDuration.length}件)
            </span>
          </h2>

          {tasksWithDuration.length === 0 ? (
            <p className="text-slate-600 py-8 text-center">
              タスクがありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タスク名</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>開始日時</TableHead>
                  <TableHead>完了日時</TableHead>
                  <TableHead className="text-right">所要時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksWithDuration.map((task) => {
                  const slackThreadUrl = buildSlackThreadUrl({
                    workspaceExternalId: workspace.externalId,
                    workspaceDomain: workspace.domain,
                    channelId: task.slackChannel,
                    threadTs: task.slackThreadTs,
                  });

                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <TableCell className="font-medium max-w-md">
                        <Link href={`/tasks/${task.id}`} className="block">
                          <div className="truncate hover:text-blue-600">
                            {task.issueTitle}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-1">
                            {task.initialSummary}
                          </div>
                        </Link>
                        {slackThreadUrl && (
                          <Link
                            href={slackThreadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Slackスレッド
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(task.createdAt)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {task.completedAt ? formatDate(task.completedAt) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-900">
                        {task.durationMs
                          ? formatDuration(task.durationMs)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
