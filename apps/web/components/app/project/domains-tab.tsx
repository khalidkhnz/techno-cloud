"use client";

import { useState } from "react";
import { BadgeCheck, Globe, Plus, ShieldQuestion, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddDomain, useDeleteDomain, useDomains, useVerifyDomain } from "@/lib/query/domains";

export function DomainsTab({ projectId }: { projectId: string }) {
  const { data: domains, isLoading } = useDomains(projectId);
  const add = useAddDomain(projectId);
  const verify = useVerifyDomain(projectId);
  const del = useDeleteDomain(projectId);

  const [hostname, setHostname] = useState("");
  const [instructions, setInstructions] = useState<{ name: string; value: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    add.mutate(hostname, {
      onSuccess: (r) => {
        setInstructions(r.instructions);
        setHostname("");
      },
    });
  }

  return (
    <div className="grid gap-4">
      {isLoading ? (
        <Skeleton className="h-24 rounded-xl bg-white/[0.04]" />
      ) : domains && domains.length > 0 ? (
        <div className="glass overflow-hidden rounded-xl">
          <ul className="divide-y divide-white/[0.06]">
            {domains.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Globe className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-mono text-xs text-foreground">{d.hostname}</span>
                {d.verified ? (
                  <span className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    <BadgeCheck className="h-2.5 w-2.5" /> verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                    <ShieldQuestion className="h-2.5 w-2.5" /> pending
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  {!d.verified && (
                    <Button variant="outline" size="sm" onClick={() => verify.mutate(d.id)}>
                      Verify
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-500 hover:text-red-300"
                    onClick={() => del.mutate(d.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon={Globe} title="No custom domains" description="Attach a domain and verify via DNS." />
      )}

      <form onSubmit={submit} className="glass flex flex-wrap items-center gap-2 rounded-xl p-3">
        <Input
          className="max-w-[18rem]"
          placeholder="app.example.com"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          required
        />
        <Button type="submit" size="sm" disabled={add.isPending} className="ml-auto">
          <Plus className="h-3.5 w-3.5" /> Add domain
        </Button>
      </form>

      {instructions && (
        <div className="glass rounded-xl p-4 text-xs text-muted-foreground">
          Add a TXT record{" "}
          <code className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-zinc-200">
            {instructions.name}
          </code>{" "}
          ={" "}
          <code className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-zinc-200">
            {instructions.value}
          </code>
          , then click verify.
        </div>
      )}
    </div>
  );
}
