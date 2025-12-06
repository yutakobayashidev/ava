export function formatDate(date: Date, includeSeconds = false): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds && { second: "2-digit" }),
  }).format(date);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}日 ${hours % 24}時間`;
  }
  if (hours > 0) {
    return `${hours}時間 ${minutes % 60}分`;
  }
  if (minutes > 0) {
    return `${minutes}分`;
  }
  return `${seconds}秒`;
}
