import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const variants = {
    in_progress: { variant: "default" as const, label: "進行中" },
    blocked: { variant: "destructive" as const, label: "ブロック中" },
    paused: { variant: "secondary" as const, label: "休止中" },
    completed: { variant: "secondary" as const, label: "完了" },
    cancelled: { variant: "destructive" as const, label: "キャンセル" },
  };

  const config =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    variants[status as keyof typeof variants] || variants.in_progress;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
