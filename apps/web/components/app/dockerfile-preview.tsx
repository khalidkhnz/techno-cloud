"use client";

import { FileCode2, ShieldCheck } from "lucide-react";

export function DockerfilePreview({
  title,
  subtitle,
  content,
}: {
  title: string;
  subtitle?: string;
  content: string;
}) {
  const lines = content.split("\n");
  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
          <FileCode2 className="h-3.5 w-3.5 text-primary" /> {title}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-primary" /> secrets masked
        </span>
      </div>
      {subtitle && (
        <p className="border-b border-white/[0.06] px-4 py-1.5 text-[11px] text-muted-foreground">
          {subtitle}
        </p>
      )}
      <pre className="max-h-[60vh] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-6 shrink-0 select-none text-right text-zinc-700">{i + 1}</span>
              <span className="min-w-0 whitespace-pre-wrap break-words text-zinc-300">
                {highlight(line)}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

// Very light Dockerfile "syntax" tinting — instructions and comments.
function highlight(line: string) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("#")) return <span className="text-zinc-600">{line}</span>;
  const m = /^(\s*)([A-Z]{2,10})(\s+.*)?$/.exec(line);
  if (m && m[2] && INSTRUCTIONS.has(m[2])) {
    return (
      <>
        {m[1]}
        <span className="font-semibold text-primary">{m[2]}</span>
        {m[3] ?? ""}
      </>
    );
  }
  return line;
}

const INSTRUCTIONS = new Set([
  "FROM",
  "WORKDIR",
  "COPY",
  "ADD",
  "RUN",
  "CMD",
  "ENV",
  "ARG",
  "EXPOSE",
  "ENTRYPOINT",
  "USER",
  "LABEL",
]);
