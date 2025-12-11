import { useCallback, useEffect, useMemo, useState } from "hono/jsx";

import type { DisplayMode, SafeArea, Task } from "../../types";
import { useOpenAiGlobal } from "../../use-openai-global";
import { TaskListView } from "./components/TaskListView";
import {
  createSafeArea,
  extractTasksFromPayload,
  isSafeArea,
  isWidgetState,
} from "./lib/helpers";

export type TaskAppProps = {
  initialTasks: Task[];
  initialTotal: number;
};

const getOpenAI = () =>
  typeof window === "undefined" ? undefined : window.openai;

export function TaskApp({ initialTasks, initialTotal }: TaskAppProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [total, setTotal] = useState<number>(initialTotal);
  const [status, setStatus] = useState("");
  const initialOpenAI = useMemo(getOpenAI, []);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    initialOpenAI?.displayMode ?? "inline",
  );
  const [maxHeight, setMaxHeight] = useState(initialOpenAI?.maxHeight ?? 0);
  const [safeArea, setSafeArea] = useState<SafeArea>(() =>
    createSafeArea(initialOpenAI?.safeArea),
  );
  const toolOutputFromGlobals = useOpenAiGlobal("toolOutput");
  const widgetStateFromGlobals = useOpenAiGlobal("widgetState");
  const displayModeFromGlobals = useOpenAiGlobal("displayMode");
  const maxHeightFromGlobals = useOpenAiGlobal("maxHeight");
  const safeAreaFromGlobals = useOpenAiGlobal("safeArea");

  const applyTasksFromPayload = useCallback(
    (payload: unknown, fallback?: Task[]) => {
      const extracted = extractTasksFromPayload(payload);
      if (extracted) {
        setTasks(extracted.tasks);
        setTotal(extracted.total);
        return true;
      }
      if (fallback) {
        setTasks(fallback);
      }
      return false;
    },
    [],
  );

  useEffect(() => {
    if (!toolOutputFromGlobals) {
      return;
    }

    applyTasksFromPayload(toolOutputFromGlobals, initialTasks);
  }, [toolOutputFromGlobals, applyTasksFromPayload, initialTasks]);

  useEffect(() => {
    if (isWidgetState(widgetStateFromGlobals)) {
      setTasks(widgetStateFromGlobals.tasks.slice());
      return;
    }

    if (widgetStateFromGlobals === null) {
      setTasks([]);
      setTotal(0);
    }
  }, [widgetStateFromGlobals]);

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
    if (typeof maxHeightFromGlobals === "number") {
      setMaxHeight(maxHeightFromGlobals);
    }
  }, [maxHeightFromGlobals]);

  useEffect(() => {
    if (isSafeArea(safeAreaFromGlobals)) {
      setSafeArea(createSafeArea(safeAreaFromGlobals));
      return;
    }

    if (safeAreaFromGlobals === null) {
      setSafeArea(createSafeArea(undefined));
    }
  }, [safeAreaFromGlobals]);

  const handleRefresh = useCallback(async () => {
    const openai = getOpenAI();
    if (!openai?.callTool) {
      setStatus("ツール API が利用できません。");
      return;
    }

    setStatus("タスク一覧を更新しています...");

    try {
      const result = await openai.callTool("listTasks", {});
      const extracted = extractTasksFromPayload(result);
      if (extracted) {
        setTasks(extracted.tasks);
        setTotal(extracted.total);
        setStatus("タスク一覧を更新しました。");
        await openai.setWidgetState?.({ tasks: extracted.tasks });
      } else {
        setStatus("タスク一覧の取得に失敗しました。");
      }
    } catch (error) {
      console.error("Failed to refresh tasks:", error);
      setStatus("タスク一覧の更新に失敗しました。もう一度お試しください。");
    }
  }, []);

  return (
    <TaskListView
      displayMode={displayMode}
      maxHeight={maxHeight}
      safeArea={safeArea}
      status={status}
      tasks={tasks}
      total={total}
      onRefresh={handleRefresh}
    />
  );
}
