"use client";

import { useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudit } from "@/lib/query/admin";

export default function AuditPage() {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data: logs, isLoading } = useAudit(filter);

  return (
    <FadeIn>
      <PageHeader title="Audit log" description="Recent mutating actions (owner only)." />

      <form
        className="mb-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter(input || undefined);
        }}
      >
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            className="pl-9"
            placeholder="filter by action (e.g. POST)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
      </form>

      {isLoading ? (
        <Skeleton className="h-40 rounded-xl bg-white/[0.04]" />
      ) : logs && logs.length > 0 ? (
        <div className="glass overflow-hidden rounded-xl">
          <ul className="divide-y divide-white/[0.06]">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <code className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-xs text-zinc-200">
                  {l.action}
                </code>
                <span className="text-xs text-muted-foreground">
                  {l.meta?.actorEmail ?? "system"}
                </span>
                {l.target && (
                  <span className="truncate font-mono text-xs text-zinc-500">{l.target}</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon={ScrollText} title="No audit entries" description="Mutating actions will appear here." />
      )}
    </FadeIn>
  );
}
