import { useCallback, useState } from "hono/jsx";

import type { DisplayMode, SafeArea } from "../../types";
import { StartTaskView } from "./components/StartTaskView";
import { createSafeArea, isSafeArea } from "./lib/helpers";
import { useOpenAiGlobal } from "../../use-openai-global";

const getOpenAI = () =>
  typeof window === "undefined" ? undefined : window.openai;

export function StartTaskApp() {
  const initialOpenAI = getOpenAI();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    initialOpenAI?.displayMode ?? "inline",
  );
  const [safeArea, setSafeArea] = useState<SafeArea>(() =>
    createSafeArea(initialOpenAI?.safeArea?.insets),
  );
  const [status, setStatus] = useState("");

  const displayModeFromGlobals = useOpenAiGlobal("displayMode");
  const safeAreaFromGlobals = useOpenAiGlobal("safeArea");

  // Sync displayMode from globals
  if (
    displayModeFromGlobals === "inline" ||
    displayModeFromGlobals === "pip" ||
    displayModeFromGlobals === "fullscreen"
  ) {
    setDisplayMode(displayModeFromGlobals);
  }

  // Sync safeArea from globals
  if (isSafeArea(safeAreaFromGlobals)) {
    setSafeArea(createSafeArea(safeAreaFromGlobals.insets));
  } else if (safeAreaFromGlobals === null) {
    setSafeArea(createSafeArea(undefined));
  }

  const handleStartTask = useCallback(
    async (data: {
      provider: "github" | "manual";
      issueId?: string;
      title: string;
      initialSummary: string;
    }) => {
      const openai = getOpenAI();
      if (!openai?.callTool) {
        setStatus("ツール API が利用できません。");
        return;
      }

      setStatus("タスクを開始しています...");

      try {
        await openai.callTool("startTask", {
          issue: {
            provider: data.provider,
            id: data.issueId || undefined,
            title: data.title,
          },
          initialSummary: data.initialSummary,
        });
        setStatus("タスクを開始しました。");
      } catch (error) {
        console.error("Failed to start task:", error);
        setStatus("タスクの開始に失敗しました。もう一度お試しください。");
      }
    },
    [],
  );

  return (
    <StartTaskView
      displayMode={displayMode}
      safeArea={safeArea}
      status={status}
      onStartTask={handleStartTask}
    />
  );
}
