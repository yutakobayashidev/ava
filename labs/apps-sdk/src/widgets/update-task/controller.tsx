import { useCallback, useEffect, useState } from "hono/jsx";

import type { DisplayMode, SafeArea, Task } from "../../types";
import { UpdateTaskView } from "./components/UpdateTaskView";
import {
  createSafeArea,
  extractTasksFromToolOutput,
  isSafeArea,
} from "./lib/helpers";
import { useOpenAiGlobal } from "../../use-openai-global";

const getOpenAI = () =>
  typeof window === "undefined" ? undefined : window.openai;

export function UpdateTaskApp() {
  const initialOpenAI = getOpenAI();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    initialOpenAI?.displayMode ?? "inline",
  );
  const [safeArea, setSafeArea] = useState<SafeArea>(() =>
    createSafeArea(initialOpenAI?.safeArea?.insets),
  );
  const [status, setStatus] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

  const displayModeFromGlobals = useOpenAiGlobal("displayMode");
  const safeAreaFromGlobals = useOpenAiGlobal("safeArea");
  const toolOutputFromGlobals = useOpenAiGlobal("toolOutput");

  // Sync displayMode
  useEffect(() => {
    if (
      displayModeFromGlobals === "inline" ||
      displayModeFromGlobals === "pip" ||
      displayModeFromGlobals === "fullscreen"
    ) {
      setDisplayMode(displayModeFromGlobals);
    }
  }, [displayModeFromGlobals]);

  // Sync safeArea
  useEffect(() => {
    if (isSafeArea(safeAreaFromGlobals)) {
      setSafeArea(createSafeArea(safeAreaFromGlobals.insets));
    } else if (safeAreaFromGlobals === null) {
      setSafeArea(createSafeArea(undefined));
    }
  }, [safeAreaFromGlobals]);

  // Load active tasks on mount
  useEffect(() => {
    const loadTasks = async () => {
      const openai = getOpenAI();
      if (!openai?.callTool) return;

      try {
        const result = await openai.callTool("listTasks", {
          status: "inProgress",
        });
        const extracted = extractTasksFromToolOutput(result);
        if (extracted) {
          setTasks(extracted);
        }
      } catch (error) {
        console.error("Failed to load tasks:", error);
      }
    };

    loadTasks();
  }, []);

  // Sync tasks from toolOutput if available
  useEffect(() => {
    if (toolOutputFromGlobals) {
      const extracted = extractTasksFromToolOutput(toolOutputFromGlobals);
      if (extracted) {
        setTasks(extracted);
      }
    }
  }, [toolOutputFromGlobals]);

  const handleUpdateTask = useCallback(
    async (data: { taskSessionId: string; summary: string }) => {
      const openai = getOpenAI();
      if (!openai?.callTool) {
        setStatus("ツール API が利用できません。");
        return;
      }

      setStatus("進捗を更新しています...");

      try {
        await openai.callTool("updateTask", data);
        setStatus("進捗を更新しました。");
      } catch (error) {
        console.error("Failed to update task:", error);
        setStatus("進捗の更新に失敗しました。もう一度お試しください。");
      }
    },
    [],
  );

  return (
    <UpdateTaskView
      displayMode={displayMode}
      safeArea={safeArea}
      status={status}
      tasks={tasks}
      onUpdateTask={handleUpdateTask}
    />
  );
}
