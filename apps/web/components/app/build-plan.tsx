import { Box, FileCode2, Package, Terminal } from "lucide-react";
import type { BuildPlan } from "@/lib/api";
import { cn } from "@/lib/utils";

const STRATEGY_META: Record<BuildPlan["strategy"], { icon: typeof Box; tone: string }> = {
  dockerfile: { icon: FileCode2, tone: "text-sky-300" },
  nixpacks: { icon: Package, tone: "text-primary" },
  static: { icon: Box, tone: "text-violet-300" },
};

export function BuildPlanView({ plan, className }: { plan: BuildPlan; className?: string }) {
  const meta = STRATEGY_META[plan.strategy];
  const Icon = meta.icon;
  return (
    <div className={cn("rounded-lg border border-white/[0.06] bg-white/[0.02] p-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className={cn("h-4 w-4", meta.tone)} /> {plan.title}
      </div>
      <ol className="mt-3 grid gap-2">
        {plan.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-xs">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-mono text-[10px] text-muted-foreground">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="text-foreground">{s.label}</span>
              {s.command && (
                <code className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground">
                  <Terminal className="h-3 w-3 shrink-0" /> {s.command}
                </code>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
