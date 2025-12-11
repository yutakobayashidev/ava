import { render } from "hono/jsx/dom";

import "../../globals.css";
import type { Task } from "../../types";
import { TaskApp } from "./controller";
import { extractTasksFromPayload, isWidgetState } from "./lib/helpers";

function getInitialData(): { tasks: Task[]; total: number } {
  const widgetState = window.openai?.widgetState;
  if (isWidgetState(widgetState)) {
    return {
      tasks: widgetState.tasks.slice(),
      total: widgetState.tasks.length,
    };
  }

  const tasksFromToolOutput = extractTasksFromPayload(
    window.openai?.toolOutput,
  );
  if (tasksFromToolOutput) {
    return {
      tasks: tasksFromToolOutput.tasks,
      total: tasksFromToolOutput.total,
    };
  }

  return { tasks: [], total: 0 };
}

const root = document.getElementById("todo-root");

if (root) {
  const { tasks, total } = getInitialData();
  render(<TaskApp initialTasks={tasks} initialTotal={total} />, root);
} else {
  console.warn("Task root element was not found.");
}

export {};
