"use client";

import { useState } from "react";
import { ExternalLink, RotateCcw, ScrollText, Rocket } from "lucide-react";
import { StatusBadge } from "@/components/app/status-badge";
import { LogViewer } from "@/components/app/log-viewer";
import { EmptyState } from "@/components/app/empty-state";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeployments, useLogs, useRollback } from "@/lib/query/deployments";

export function DeploymentsTab({ projectId }: { projectId: string }) {
  const { data: deployments, isLoading } = useDeployments(projectId);
  const [logDep, setLogDep] = useState<string | null>(null);
  const { data: logs } = useLogs(projectId, logDep, true);
  const rollback = useRollback(projectId);

  if (isLoading) return <Skeleton className="h-40 rounded-xl bg-white/[0.04]" />;

  if (!deployments || deployments.length === 0) {
    return (
      <EmptyState
        icon={Rocket}
        title="No deployments yet"
        description="Trigger a deploy to build and ship this project."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="glass overflow-hidden rounded-xl">
        <ul className="divide-y divide-white/[0.06]">
          {deployments.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <StatusBadge state={d.state} />
              <span className="text-xs text-muted-foreground">
                {new Date(d.createdAt).toLocaleString()}
              </span>
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 truncate text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> {d.url.replace(/^https?:\/\//, "")}
                </a>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogDep(logDep === d.id ? null : d.id)}
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  {logDep === d.id ? "Hide logs" : "Logs"}
                </Button>
                {d.state === "ready" && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-3.5 w-3.5" /> Rollback
                      </Button>
                    }
                    title="Roll back to this deployment?"
                    description="This queues a new deployment from this build."
                    confirmLabel="Roll back"
                    onConfirm={async () => {
                      await rollback.mutateAsync(d.id);
                    }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {logDep && <LogViewer lines={logs ?? []} live />}
    </div>
  );
}
