import type { SafeArea, SafeAreaInsets } from "../../../types";

export function createSafeArea(insets?: Partial<SafeAreaInsets>): SafeArea {
  return {
    insets: {
      top: insets?.top ?? 0,
      bottom: insets?.bottom ?? 0,
      left: insets?.left ?? 0,
      right: insets?.right ?? 0,
    },
  };
}

export function isSafeArea(value: unknown): value is SafeArea {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!candidate.insets || typeof candidate.insets !== "object") return false;
  const insets = candidate.insets as Record<string, unknown>;
  return (
    typeof insets.top === "number" &&
    typeof insets.bottom === "number" &&
    typeof insets.left === "number" &&
    typeof insets.right === "number"
  );
}
