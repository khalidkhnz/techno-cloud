"use client";

import { useState } from "react";
import { KeyRound, Lock, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteEnvVar, useEnvVars, useUpsertEnvVar } from "@/lib/query/env-vars";

export function EnvVarsTab({ projectId }: { projectId: string }) {
  const { data: vars, isLoading } = useEnvVars(projectId);
  const upsert = useUpsertEnvVar(projectId);
  const del = useDeleteEnvVar(projectId);

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(false);

  function add(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate(
      { key, value, isSecret: secret },
      {
        onSuccess: () => {
          setKey("");
          setValue("");
          setSecret(false);
        },
      },
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Scope: production. Secrets are stored in Parameter Store and shown as ***.
      </p>

      {isLoading ? (
        <Skeleton className="h-24 rounded-xl bg-white/[0.04]" />
      ) : vars && vars.length > 0 ? (
        <div className="glass overflow-hidden rounded-xl">
          <ul className="divide-y divide-white/[0.06]">
            {vars.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <code className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-xs text-zinc-200">
                  {v.key}
                </code>
                <span className="text-zinc-500">=</span>
                <code className="truncate font-mono text-xs text-muted-foreground">{v.value}</code>
                {v.isSecret && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                    <Lock className="h-2.5 w-2.5" /> secret
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-7 w-7 text-zinc-500 hover:text-red-300"
                  onClick={() => del.mutate(v.key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon={KeyRound} title="No variables" description="Add configuration for this project." />
      )}

      <form onSubmit={add} className="glass flex flex-wrap items-center gap-2 rounded-xl p-3">
        <Input
          className="max-w-[10rem] font-mono"
          placeholder="KEY"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
        />
        <Input
          className="max-w-[14rem]"
          placeholder="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="accent-[hsl(var(--primary))]"
            checked={secret}
            onChange={(e) => setSecret(e.target.checked)}
          />
          secret
        </label>
        <Button type="submit" size="sm" disabled={upsert.isPending} className="ml-auto">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </form>
    </div>
  );
}
