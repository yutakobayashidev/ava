/** @jsxImportSource hono/jsx */

import type { DisplayMode, SafeArea, Task } from "../../../types";

type TaskListViewProps = {
  tasks: Task[];
  total: number;
  status: string;
  displayMode: DisplayMode;
  maxHeight: number;
  safeArea: SafeArea;
  onRefresh: () => void;
};

const getStatusBadgeClass = (status: Task["status"]): string => {
  switch (status) {
    case "inProgress":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "blocked":
      return "bg-red-100 text-red-800 border-red-200";
    case "paused":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
  }
};

const getStatusLabel = (status: Task["status"]): string => {
  switch (status) {
    case "inProgress":
      return "進行中";
    case "blocked":
      return "ブロック";
    case "paused":
      return "一時停止";
    case "completed":
      return "完了";
  }
};

export const TaskListView = ({
  tasks,
  total,
  status,
  displayMode,
  maxHeight,
  safeArea,
  onRefresh,
}: TaskListViewProps) => {
  const insets = safeArea.insets;
  const availableHeight =
    maxHeight > 0
      ? Math.max(0, maxHeight - insets.top - insets.bottom)
      : undefined;
  const widgetInlineStyle: Record<string, string | undefined> = {
    paddingTop: `calc(1.25rem + ${insets.top}px)`,
    paddingBottom: `calc(1.25rem + ${insets.bottom}px)`,
    paddingLeft: `calc(1.25rem + ${insets.left}px)`,
    paddingRight: `calc(1.25rem + ${insets.right}px)`,
    maxHeight: availableHeight ? `${availableHeight}px` : undefined,
  };

  return (
    <section
      class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-auto"
      aria-live="polite"
      data-display-mode={displayMode}
      style={widgetInlineStyle}
    >
      <div class="max-w-2xl mx-auto">
        <header class="mb-6">
          <h1 class="text-3xl font-bold text-slate-900 mb-2">
            Ava Task Manager
          </h1>
          <p class="text-sm text-slate-600">
            MCPサーバーからタスク一覧を表示しています
          </p>
        </header>

        <section class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-blue-900 font-medium">
                合計 {total} 件のタスク
              </p>
            </div>
            <button
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onClick={onRefresh}
            >
              更新
            </button>
          </div>
        </section>

        {status && (
          <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p class="text-sm text-amber-900">{status}</p>
          </div>
        )}

        <ul class="space-y-2">
          {tasks.length === 0 ? (
            <li class="p-6 bg-white border border-slate-200 rounded-lg text-center">
              <p class="text-slate-500">タスクがありません</p>
            </li>
          ) : (
            tasks.map((task) => (
              <li
                key={task.taskSessionId}
                class="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <h3 class="font-medium text-slate-900">
                      {task.issueTitle}
                    </h3>
                    <span
                      class={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusBadgeClass(task.status)}`}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  <div class="flex items-center gap-4 text-xs text-slate-500">
                    <span>
                      {task.issueProvider === "github" ? "GitHub" : "Manual"}
                      {task.issueId && ` #${task.issueId}`}
                    </span>
                    <span>
                      更新: {new Date(task.updatedAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
};
