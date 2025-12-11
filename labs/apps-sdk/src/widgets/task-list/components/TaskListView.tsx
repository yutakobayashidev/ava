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

const getStatusEmoji = (status: Task["status"]): string => {
  switch (status) {
    case "inProgress":
      return "▶️";
    case "blocked":
      return "🚫";
    case "paused":
      return "⏸️";
    case "completed":
      return "✅";
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
  const containerStyle: Record<string, string | undefined> = {
    paddingTop: `${insets.top}px`,
    paddingBottom: `${insets.bottom}px`,
    paddingLeft: `${insets.left}px`,
    paddingRight: `${insets.right}px`,
  };

  return (
    <div
      class="bg-white"
      aria-live="polite"
      data-display-mode={displayMode}
      style={containerStyle}
    >
      {/* Status message */}
      {status && (
        <div class="px-4 py-2 mb-3 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-700">{status}</p>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div class="px-4 py-8 text-center">
          <p class="text-sm text-gray-500">タスクがありません</p>
        </div>
      ) : (
        <ul class="divide-y divide-gray-100">
          {tasks.map((task) => (
            <li key={task.taskSessionId} class="px-4 py-3">
              <div class="flex items-start gap-3">
                <span class="text-lg leading-none" aria-hidden="true">
                  {getStatusEmoji(task.status)}
                </span>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-medium text-gray-900 mb-1">
                    {task.issueTitle}
                  </h3>
                  <div class="flex items-center gap-3 text-xs text-gray-500">
                    <span>{getStatusLabel(task.status)}</span>
                    {task.issueProvider === "github" && task.issueId && (
                      <span>#{task.issueId}</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Footer with actions */}
      <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span class="text-xs text-gray-500">{total}件のタスク</span>
        <button
          class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          type="button"
          onClick={onRefresh}
          aria-label="タスク一覧を更新"
        >
          更新
        </button>
      </div>
    </div>
  );
};
