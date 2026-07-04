import { Boxes, Cloud, Container, Globe, Server, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const TARGETS: Record<string, { label: string; icon: LucideIcon }> = {
  lambda: { label: "Lambda", icon: Zap },
  amplify: { label: "Amplify", icon: Globe },
  "static-cdn": { label: "Static / CDN", icon: Cloud },
  apprunner: { label: "App Runner", icon: Container },
  "ecs-fargate": { label: "ECS Fargate", icon: Boxes },
  ec2: { label: "EC2", icon: Server },
};

export function TargetBadge({ target, className }: { target?: string; className?: string }) {
  const meta = (target && TARGETS[target]) || { label: target ?? "—", icon: Cloud };
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-zinc-300",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      {meta.label}
    </span>
  );
}
