import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  ok: "bg-primary",
  warn: "bg-amber-400",
  alert: "bg-orange-400",
  exceeded: "bg-red-500",
};

export function MeterBar({
  label,
  used,
  limit,
  unit,
  pct,
  status = "ok",
}: {
  label: string;
  used?: number;
  limit?: number;
  unit?: string;
  pct: number;
  status?: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {used !== undefined && limit !== undefined
            ? `${used.toLocaleString()} / ${limit.toLocaleString()}${unit ? ` ${unit}` : ""}`
            : `${Math.round(clamped)}%`}
        </span>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-all", STATUS_COLOR[status] ?? "bg-primary")}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
