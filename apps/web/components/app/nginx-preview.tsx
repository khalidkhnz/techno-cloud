"use client";

import { FileCode2, GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nginx config preview.
 * - "new": shows the config that will be written to /etc/nginx/conf.d/app.conf.
 * - "existing": git-diff style — current instance config as context, the appended block as additions.
 */
export function NginxPreview({
  mode,
  appended,
  current,
  note,
  instanceId,
}: {
  mode: "new" | "existing";
  appended: string;
  current?: string | null;
  note?: string;
  instanceId?: string;
}) {
  const isDiff = mode === "existing";
  const title = isDiff
    ? `Nginx · appended to ${instanceId || "instance"}`
    : "Nginx · /etc/nginx/conf.d/app.conf";

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
          {isDiff ? (
            <GitCompareArrows className="h-3.5 w-3.5 text-primary" />
          ) : (
            <FileCode2 className="h-3.5 w-3.5 text-primary" />
          )}
          {title}
        </span>
        {isDiff && (
          <span className="text-[10px] text-muted-foreground">
            {current ? "existing preserved · new appended" : "new server block"}
          </span>
        )}
      </div>

      <pre className="max-h-[45vh] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed">
        <code>
          {isDiff && current
            ? current
                .split("\n")
                .map((l, i) => <Line key={`c${i}`} kind="ctx" text={l} />)
            : null}
          {isDiff && current && <div className="h-2" />}
          {appended.split("\n").map((l, i) => (
            <Line key={`a${i}`} kind={isDiff ? "add" : "ctx"} text={l} />
          ))}
        </code>
      </pre>

      {note && (
        <p className="border-t border-white/[0.06] px-4 py-2 text-[11px] text-amber-200/80">{note}</p>
      )}
    </div>
  );
}

function Line({ kind, text }: { kind: "ctx" | "add"; text: string }) {
  return (
    <div
      className={cn(
        "flex gap-2",
        kind === "add" && "bg-primary/[0.08]",
      )}
    >
      <span
        className={cn(
          "w-3 shrink-0 select-none text-center",
          kind === "add" ? "text-primary" : "text-zinc-700",
        )}
      >
        {kind === "add" ? "+" : " "}
      </span>
      <span
        className={cn(
          "min-w-0 whitespace-pre-wrap break-words",
          kind === "add" ? "text-primary/90" : "text-zinc-400",
        )}
      >
        {text}
      </span>
    </div>
  );
}
