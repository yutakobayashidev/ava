/** @jsxImportSource hono/jsx */

import { useState } from "hono/jsx";
import type { DisplayMode, SafeArea } from "../../../types";

type StartTaskViewProps = {
  displayMode: DisplayMode;
  safeArea: SafeArea;
  status: string;
  onStartTask: (data: {
    provider: "github" | "manual";
    issueId?: string;
    title: string;
    initialSummary: string;
  }) => void;
};

export const StartTaskView = ({
  displayMode,
  safeArea,
  status,
  onStartTask,
}: StartTaskViewProps) => {
  const [provider, setProvider] = useState<"github" | "manual">("manual");
  const [issueId, setIssueId] = useState("");
  const [title, setTitle] = useState("");
  const [initialSummary, setInitialSummary] = useState("");

  const insets = safeArea.insets;
  const containerStyle: Record<string, string | undefined> = {
    paddingTop: `${insets.top}px`,
    paddingBottom: `${insets.bottom}px`,
    paddingLeft: `${insets.left}px`,
    paddingRight: `${insets.right}px`,
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onStartTask({
      provider,
      issueId: provider === "github" ? issueId : undefined,
      title,
      initialSummary,
    });
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
        {/* Provider selection */}
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-900 mb-2">
            課題の取得元
          </label>
          <div class="flex gap-3">
            <label class="flex items-center">
              <input
                type="radio"
                name="provider"
                value="manual"
                checked={provider === "manual"}
                onChange={() => setProvider("manual")}
                class="mr-2"
              />
              <span class="text-sm text-gray-700">Manual</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                name="provider"
                value="github"
                checked={provider === "github"}
                onChange={() => setProvider("github")}
                class="mr-2"
              />
              <span class="text-sm text-gray-700">GitHub</span>
            </label>
          </div>
        </div>

        {/* Issue ID (GitHub only) */}
        {provider === "github" && (
          <div class="mb-4">
            <label
              for="issueId"
              class="block text-sm font-medium text-gray-900 mb-2"
            >
              Issue番号
            </label>
            <input
              type="text"
              id="issueId"
              value={issueId}
              onInput={(e) => setIssueId((e.target as HTMLInputElement).value)}
              placeholder="123"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Title */}
        <div class="mb-4">
          <label
            for="title"
            class="block text-sm font-medium text-gray-900 mb-2"
          >
            タスクのタイトル *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="例: ログイン機能の実装"
            required
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Initial Summary */}
        <div class="mb-4">
          <label
            for="initialSummary"
            class="block text-sm font-medium text-gray-900 mb-2"
          >
            初期サマリ *
          </label>
          <textarea
            id="initialSummary"
            value={initialSummary}
            onInput={(e) =>
              setInitialSummary((e.target as HTMLTextAreaElement).value)
            }
            placeholder="着手時点の状況や方針を入力してください"
            required
            rows={3}
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div class="flex justify-end pt-2">
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            タスクを開始
          </button>
        </div>
      </form>
    </div>
  );
};
