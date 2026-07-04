"use client";

import { useState } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateEnvironment,
  useDeleteEnvironment,
  useEnvironments,
} from "@/lib/query/environments";
import { useMeta } from "@/lib/query/meta";

export function EnvironmentsTab({ projectId }: { projectId: string }) {
  const { data: envs, isLoading } = useEnvironments(projectId);
  const { data: meta } = useMeta();
  const kinds = meta?.environmentKinds ?? ["development", "preview", "production"];
  const create = useCreateEnvironment(projectId);
  const del = useDeleteEnvironment(projectId);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("development");

  function add(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({ kind, name }, { onSuccess: () => setName("") });
  }

  return (
    <div className="grid gap-4">
      {isLoading ? (
        <Skeleton className="h-24 rounded-xl bg-white/[0.04]" />
      ) : envs && envs.length > 0 ? (
        <div className="glass overflow-hidden rounded-xl">
          <ul className="divide-y divide-white/[0.06]">
            {envs.map((en) => (
              <li key={en.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium text-foreground">{en.name}</span>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {en.kind}
                </span>
                {en.kind !== "production" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 text-zinc-500 hover:text-red-300"
                    onClick={() => del.mutate(en.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon={Layers} title="No environments" description="Add a preview or dev environment." />
      )}

      <form onSubmit={add} className="glass flex flex-wrap items-center gap-2 rounded-xl p-3">
        <Input
          className="max-w-[12rem]"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="max-w-[11rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={create.isPending} className="ml-auto">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </form>
    </div>
  );
}
