import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { db } from "@/clients/drizzle";
import { createTaskRepository, createWorkspaceRepository } from "@/repos";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}日 ${hours % 24}時間`;
  }
  if (hours > 0) {
    return `${hours}時間 ${minutes % 60}分`;
  }
  if (minutes > 0) {
    return `${minutes}分`;
  }
  return `${seconds}秒`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login");
  }

  const workspaceRepository = createWorkspaceRepository({ db });
  const [membership] = await workspaceRepository.listWorkspacesForUser({
    userId: user.id,
    limit: 1,
  });
  const workspace = membership?.workspace;

  if (!workspace) {
    redirect("/onboarding/connect-slack");
  }

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
        const completion = await taskRepository.findCompletionByTaskSessionId(
          task.id,
        );
        if (completion) {
          completedAt = completion.createdAt;
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">
            タスクの進捗状況と所要時間を確認できます
          </p>
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
                {tasksWithDuration.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium max-w-md">
                      <div className="truncate">{task.issueTitle}</div>
                      <div className="text-xs text-slate-500 truncate mt-1">
                        {task.initialSummary}
                      </div>
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
                      {task.durationMs ? formatDuration(task.durationMs) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
