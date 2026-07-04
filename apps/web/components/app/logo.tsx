import { Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="glow flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Rocket className="h-4 w-4" />
      </span>
      {showWord && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          techno<span className="text-primary">·</span>deployer
        </span>
      )}
    </span>
  );
}
