import { useCallback, useEffect, useState } from "hono/jsx";

import type { DisplayMode, SafeArea, Task } from "../../types";
import { CompleteTaskView } from "./components/CompleteTaskView";
import {
  createSafeArea,
  extractTasksFromToolOutput,
  isSafeArea,
} from "./lib/helpers";
import { useOpenAiGlobal } from "../../use-openai-global";

const getOpenAI = () =>
  typeof window === "undefined" ? undefined : window.openai;

export function CompleteTaskApp() {
  const initialOpenAI = getOpenAI();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    initialOpenAI?.displayMode ?? "inline",
  );
  const [safeArea, setSafeArea] = useState<SafeArea>(() =>
    createSafeArea(initialOpenAI?.safeArea),
  );
  const [status, setStatus] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

  const displayModeFromGlobals = useOpenAiGlobal("displayMode");
  const safeAreaFromGlobals = useOpenAiGlobal("safeArea");
  const toolOutputFromGlobals = useOpenAiGlobal("toolOutput");

  useEffect(() => {
    if (
      displayModeFromGlobals === "inline" ||
      displayModeFromGlobals === "pip" ||
      displayModeFromGlobals === "fullscreen"
    ) {
      setDisplayMode(displayModeFromGlobals);
    }
  }, [displayModeFromGlobals]);

  useEffect(() => {
    if (isSafeArea(safeAreaFromGlobals)) {
      setSafeArea(createSafeArea(safeAreaFromGlobals));
    } else if (safeAreaFromGlobals === null) {
      setSafeArea(createSafeArea(undefined));
    }
  }, [safeAreaFromGlobals]);

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

  useEffect(() => {
    if (toolOutputFromGlobals) {
      const extracted = extractTasksFromToolOutput(toolOutputFromGlobals);
      if (extracted) {
        setTasks(extracted);
      }
    }
  }, [toolOutputFromGlobals]);

  const handleCompleteTask = useCallback(
    async (data: { taskSessionId: string; summary: string }) => {
      const openai = getOpenAI();
      if (!openai?.callTool) {
        setStatus("ツール API が利用できません。");
        return;
      }

      setStatus("タスクを完了しています...");

      try {
        await openai.callTool("completeTask", data);
        setStatus("タスクを完了しました。");
      } catch (error) {
        console.error("Failed to complete task:", error);
        setStatus("タスクの完了に失敗しました。もう一度お試しください。");
      }
    },
    [],
  );

  return (
    <CompleteTaskView
      displayMode={displayMode}
      safeArea={safeArea}
      status={status}
      tasks={tasks}
      onCompleteTask={handleCompleteTask}
    />
  );
}
