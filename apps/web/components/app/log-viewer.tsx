"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export function LogViewer({
  lines,
  live,
}: {
  lines: { timestamp: number; message: string }[];
  live?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines.length]);

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" /> Build logs
        </span>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-xs text-primary">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" /> live · 3s
          </span>
        )}
      </div>
      <div className="max-h-80 overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-300">
        {lines.length ? (
          lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-words">
              <span className="mr-2 select-none text-zinc-600">
                {String(i + 1).padStart(3, "0")}
              </span>
              {l.message}
            </div>
          ))
        ) : (
          <div className="text-zinc-500">Waiting for logs…</div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
