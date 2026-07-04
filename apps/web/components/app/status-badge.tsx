import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "warn" | "danger" | "neutral";

const TONE: Record<Tone, string> = {
  success: "bg-primary/10 text-primary border-primary/20",
  info: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  warn: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  danger: "bg-destructive/10 text-red-300 border-destructive/25",
  neutral: "bg-white/[0.04] text-zinc-400 border-white/10",
};

// Deployment/meter states → tone + whether the dot should pulse.
const STATE: Record<string, { tone: Tone; label: string; pulse?: boolean }> = {
  ready: { tone: "success", label: "Ready" },
  live: { tone: "success", label: "Live", pulse: true },
  ok: { tone: "success", label: "OK" },
  verified: { tone: "success", label: "Verified" },
  building: { tone: "info", label: "Building", pulse: true },
  queued: { tone: "info", label: "Queued", pulse: true },
  deploying: { tone: "info", label: "Deploying", pulse: true },
  pending: { tone: "warn", label: "Pending" },
  warn: { tone: "warn", label: "Warn" },
  alert: { tone: "warn", label: "Alert" },
  failed: { tone: "danger", label: "Failed" },
  error: { tone: "danger", label: "Error" },
  exceeded: { tone: "danger", label: "Exceeded" },
  destroyed: { tone: "neutral", label: "Destroyed" },
};

export function StatusBadge({ state, className }: { state: string; className?: string }) {
  const meta = STATE[state.toLowerCase()] ?? {
    tone: "neutral" as Tone,
    label: state.charAt(0).toUpperCase() + state.slice(1),
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE[meta.tone],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          meta.pulse && "animate-pulse-glow",
        )}
      />
      {meta.label}
    </span>
  );
}
