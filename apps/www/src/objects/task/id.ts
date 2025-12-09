import { uuidv7 } from "uuidv7";

/**
 * ID value object generator
 * タスクセッション、ブロック、ポーズなど、すべてのエンティティIDを生成する汎用関数
 */
export function generateId(): string {
  return uuidv7();
}
