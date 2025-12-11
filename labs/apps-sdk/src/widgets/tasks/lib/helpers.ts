import type {
  SafeArea,
  StructuredContent,
  Task,
  TaskListPayload,
  WidgetState,
} from "../../../types";

const STRUCTURED_CONTENT_KEYS = [
  "structuredContent",
  "structured_content",
  "structuredOutput",
  "structured_output",
] as const;

const ADDITIONAL_PAYLOAD_KEYS = ["result", "data", "json", "payload"] as const;

// ====================
// Type Guards
// ====================

export function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.taskSessionId === "string" &&
    (record.issueProvider === "github" || record.issueProvider === "manual") &&
    (record.issueId === null || typeof record.issueId === "string") &&
    typeof record.issueTitle === "string" &&
    typeof record.status === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

/**
 * TaskListPayload の型ガード
 */
export function isTaskListPayload(value: unknown): value is TaskListPayload {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { tasks?: unknown; total?: unknown };
  if (!Array.isArray(record.tasks)) return false;
  if (typeof record.total !== "number") return false;
  return record.tasks.every((task) => isTask(task));
}

export function isStructuredContent(
  value: unknown,
): value is StructuredContent {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { tasks?: unknown; total?: unknown };
  if (!Array.isArray(record.tasks)) return false;
  if (typeof record.total !== "number") return false;
  return record.tasks.every((task) => isTask(task));
}

export function isWidgetState(value: unknown): value is WidgetState {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { tasks?: unknown };
  if (!Array.isArray(record.tasks)) return false;
  return record.tasks.every((task) => isTask(task));
}

export function isSafeArea(value: unknown): value is SafeArea {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { insets?: unknown };
  if (typeof record.insets !== "object" || record.insets === null) return false;
  const insets = record.insets as Record<string, unknown>;
  return ["top", "bottom", "left", "right"].every(
    (key) => typeof insets[key] === "number",
  );
}

// ====================
// SafeArea Utilities
// ====================

export function createSafeArea(value: unknown): SafeArea {
  if (isSafeArea(value)) {
    return {
      insets: {
        top: value.insets.top,
        bottom: value.insets.bottom,
        left: value.insets.left,
        right: value.insets.right,
      },
    };
  }

  return {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  };
}

// ====================
// Payload Extraction - 共通BFSロジック
// ====================

const enqueueIfPresent = (queue: unknown[], value: unknown) => {
  if (value !== undefined && value !== null) {
    queue.push(value);
  }
};

function extractFromPayloadBFS<T>(
  value: unknown,
  matcher: (current: unknown) => T | null,
): T | null {
  const queue: unknown[] = [value];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || current === null) {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    const matched = matcher(current);
    if (matched !== null) {
      return matched;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    const record = current as Record<string, unknown>;

    for (const key of STRUCTURED_CONTENT_KEYS) {
      if (key in record) {
        enqueueIfPresent(queue, record[key]);
      }
    }

    if (Array.isArray(record.content)) {
      queue.push(...record.content);
    }

    for (const key of ADDITIONAL_PAYLOAD_KEYS) {
      if (key in record) {
        enqueueIfPresent(queue, record[key]);
      }
    }
  }

  return null;
}

export function extractTasksFromPayload(
  value: unknown,
): TaskListPayload | null {
  return extractFromPayloadBFS<TaskListPayload>(value, (current) => {
    if (isTaskListPayload(current)) {
      return {
        tasks: current.tasks.slice(),
        total: current.total,
      };
    }
    return null;
  });
}
