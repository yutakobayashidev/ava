/** @jsxImportSource hono/jsx */

import { useState } from "hono/jsx";
import type { DisplayMode, SafeArea, Task } from "../../../types";

type CompleteTaskViewProps = {
  displayMode: DisplayMode;
  safeArea: SafeArea;
  status: string;
  tasks: Task[];
  onCompleteTask: (data: { taskSessionId: string; summary: string }) => void;
};

export const CompleteTaskView = ({
  displayMode,
  safeArea,
  status,
  tasks,
  onCompleteTask,
}: CompleteTaskViewProps) => {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [summary, setSummary] = useState("");

  const insets = safeArea.insets;
  const containerStyle: Record<string, string | undefined> = {
    paddingTop: `${insets.top}px`,
    paddingBottom: `${insets.bottom}px`,
    paddingLeft: `${insets.left}px`,
    paddingRight: `${insets.right}px`,
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedTaskId || !summary) return;
    onCompleteTask({ taskSessionId: selectedTaskId, summary });
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

      {/* Form */}
      <form onSubmit={handleSubmit} class="px-4 py-3">
        {/* Task selection */}
        <div class="mb-4">
          <label
            for="taskSelect"
            class="block text-sm font-medium text-gray-900 mb-2"
          >
            タスクを選択 *
          </label>
          {tasks.length === 0 ? (
            <p class="text-sm text-gray-500">進行中のタスクがありません</p>
          ) : (
            <select
              id="taskSelect"
              value={selectedTaskId}
              onChange={(e) =>
                setSelectedTaskId((e.target as HTMLSelectElement).value)
              }
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">タスクを選択してください</option>
              {tasks.map((task) => (
                <option key={task.taskSessionId} value={task.taskSessionId}>
                  {task.issueTitle}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Summary */}
        <div class="mb-4">
          <label
            for="summary"
            class="block text-sm font-medium text-gray-900 mb-2"
          >
            完了サマリ *
          </label>
          <textarea
            id="summary"
            value={summary}
            onInput={(e) => setSummary((e.target as HTMLTextAreaElement).value)}
            placeholder="完了内容の抽象的なサマリを入力してください"
            required
            rows={3}
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div class="flex justify-end pt-2">
          <button
            type="submit"
            disabled={tasks.length === 0}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            完了を報告
          </button>
        </div>
      </form>
    </div>
  );
};
