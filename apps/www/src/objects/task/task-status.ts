/**
 * タスクステータスの値の配列
 * この配列がステータスの唯一の真実の源（Single Source of Truth）
 */
export const TASK_STATUSES = [
  "in_progress",
  "blocked",
  "paused",
  "completed",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskStatusFilter =
  | "inProgress"
  | "blocked"
  | "paused"
  | "completed";

const STATUS_FILTER_TO_TASK_STATUS: Record<TaskStatusFilter, TaskStatus> = {
  inProgress: "in_progress",
  blocked: "blocked",
  paused: "paused",
  completed: "completed",
};

/**
 * 許可される状態遷移のマップ
 * - in_progress: 作業中 → ブロッキング/休止/完了/中止へ遷移可能
 * - blocked: ブロッキング → 作業再開/休止/中止へ遷移可能
 * - paused: 休止 → 作業再開/中止へ遷移可能
 * - completed: 完了 (終端状態、遷移不可)
 * - cancelled: 中止 (終端状態、遷移不可)
 */
export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  in_progress: ["blocked", "paused", "completed", "cancelled"],
  blocked: ["in_progress", "paused", "cancelled"],
  paused: ["in_progress", "cancelled"],
  completed: [], // 終端状態
  cancelled: [], // 終端状態
};

/**
 * 状態遷移が有効かどうかを検証する
 * @param from 現在の状態
 * @param to 遷移先の状態
 * @returns 有効な遷移の場合true、そうでない場合false
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  // 同じ状態への遷移は常に許可
  if (from === to) {
    return true;
  }

  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * 状態遷移を検証し、無効な場合はエラーをスローする
 * @param from 現在の状態
 * @param to 遷移先の状態
 * @throws {Error} 無効な遷移の場合
 */
export function validateTransition(from: TaskStatus, to: TaskStatus): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid status transition: ${from} → ${to}. Allowed transitions from ${from}: [${ALLOWED_TRANSITIONS[from].join(", ")}]`,
    );
  }
}

/**
 * 終端状態（それ以上遷移できない状態）かどうかを判定する
 * @param status チェックする状態
 * @returns 終端状態の場合true
 */
export function isTerminalStatus(status: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export function toTaskStatus(
  status?: TaskStatusFilter,
): TaskStatus | undefined {
  if (!status) return undefined;
  return STATUS_FILTER_TO_TASK_STATUS[status];
}
