"use client";

import { useState } from "react";
import { Activity, DollarSign, Gauge, Lightbulb, Plus, Trash2, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { MeterBar } from "@/components/app/meter-bar";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBudgets,
  useCostAdvice,
  useCostSnapshots,
  useCreateBudget,
  useDeleteBudget,
  useMeters,
} from "@/lib/query/costs";

export default function CostsPage() {
  const { data: meters, isLoading: metersLoading } = useMeters();
  const { data: snapshots } = useCostSnapshots();
  const { data: advice } = useCostAdvice();
  const { data: budgets } = useBudgets();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();
  const [amount, setAmount] = useState("");

  const globalSnapshots = (snapshots ?? []).filter((s) => s.scope === "global").slice(0, 5);
  const latest = globalSnapshots[0];
  const breached = (meters ?? []).filter((m) => m.status !== "ok").length;

  return (
    <FadeIn>
      <PageHeader
        title="Costs"
        description="Free-tier usage, reconciled spend, and budgets."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Month-to-date"
          value={latest ? `$${Number(latest.actualUsd).toFixed(2)}` : "—"}
          hint={latest ? `${latest.period} · all projects` : "poller runs daily"}
          icon={DollarSign}
        />
        <StatCard
          label="Meters tracked"
          value={meters?.length ?? 0}
          hint="AWS always-free allowances"
          icon={Gauge}
        />
        <StatCard
          label="At risk"
          value={breached}
          hint="meters over 80%"
          icon={Activity}
        />
      </div>

      {advice && (advice.suggestions.length > 0 || advice.rateCard.stale) && (
        <div className="mb-6 grid gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-amber-300" /> Suggestions
          </h2>
          {advice.suggestions.map((s) => (
            <div
              key={s.project}
              className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5 text-sm text-amber-100"
            >
              <span className="font-medium">{s.name}</span>: {s.recommendation}
            </div>
          ))}
          {advice.rateCard.stale && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5 text-sm text-amber-100">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              Pricing rate card (as of {advice.rateCard.asOf}) is &gt;90 days old — re-verify pricing.
            </div>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Free-tier usage</h2>
      {metersLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : meters && meters.length > 0 ? (
        <Stagger className="grid gap-3">
          {meters.map((m) => (
            <StaggerItem key={`${m.service}:${m.metric}`}>
              <MeterBar
                label={`${m.service} · ${m.metric}`}
                used={m.used}
                limit={m.limit}
                unit={m.unit}
                pct={m.pct}
                status={m.status}
              />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <p className="text-sm text-muted-foreground">No meter data.</p>
      )}

      <h2 className="mb-3 mt-8 text-sm font-medium text-muted-foreground">
        Reconciled cost (Cost Explorer)
      </h2>
      <div className="glass overflow-hidden rounded-xl">
        <ul className="divide-y divide-white/[0.06]">
          {globalSnapshots.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{s.period} · all projects</span>
              <span className="font-mono font-medium text-foreground">
                ${Number(s.actualUsd).toFixed(2)}
              </span>
            </li>
          ))}
          {globalSnapshots.length === 0 && (
            <li className="px-4 py-2.5 text-sm text-muted-foreground">
              No snapshots yet (poller runs daily).
            </li>
          )}
        </ul>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-medium text-muted-foreground">Budgets</h2>
      <div className="glass overflow-hidden rounded-xl">
        <ul className="divide-y divide-white/[0.06]">
          {(budgets ?? []).map((b) => (
            <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-foreground">
                {b.scope}
                {b.refId ? ` · ${b.refId.slice(0, 8)}` : ""} —{" "}
                <span className="font-mono">${Number(b.thresholdUsd).toFixed(2)}/mo</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:text-red-300"
                onClick={() => deleteBudget.mutate(b.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
          {(!budgets || budgets.length === 0) && (
            <li className="px-4 py-2.5 text-sm text-muted-foreground">No budgets.</li>
          )}
        </ul>
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          createBudget.mutate(
            { scope: "global", thresholdUsd: Number(amount) },
            { onSuccess: () => setAmount("") },
          );
        }}
      >
        <Input
          className="max-w-[11rem]"
          type="number"
          step="0.01"
          placeholder="global $/mo"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Button type="submit" size="sm" disabled={createBudget.isPending}>
          <Plus className="h-3.5 w-3.5" /> Set budget
        </Button>
      </form>
    </FadeIn>
  );
}
