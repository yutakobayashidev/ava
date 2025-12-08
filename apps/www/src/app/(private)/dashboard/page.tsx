import { Header } from "@/components/header";
import { StatusBadge } from "@/components/task/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireWorkspace } from "@/lib/auth";
import { createTasksClient } from "@/clients/tasksClient";
import { getInitials } from "@/lib/utils";
import { formatDate, formatDuration } from "@/utils/date";
import { buildSlackThreadUrl } from "@/utils/slack";
import { db } from "@ava/database/client";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspace(db);

  // API経由でタスク一覧を取得（所要時間はバックエンドで計算済み）
  const cookieStore = await cookies();
  const tasksClient = createTasksClient(cookieStore.toString());
  const res = await tasksClient.index.$get({ query: { limit: "100" } });
  const { tasks } = await res.json();

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
              ({tasks.length}件)
            </span>
          </h2>

          {tasks.length === 0 ? (
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
                {tasks.map((task) => {
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
                        {formatDate(new Date(task.createdAt))}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {task.completedAt
                          ? formatDate(new Date(task.completedAt))
                          : "-"}
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
