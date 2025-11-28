"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DailySummaryButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/daily-summary", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      setMessage({
        type: "success",
        text: `今日のまとめを生成しました（${data.tasksCount}件のタスク）`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "エラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGenerateSummary}
        disabled={isLoading}
        variant="default"
      >
        {isLoading ? "生成中..." : "今日のまとめを生成"}
      </Button>

      {message && (
        <div
          className={`text-sm ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
