"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Budget, type CostSnapshot, type FreeTierMeter } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

const STATUS_COLOR: Record<FreeTierMeter["status"], string> = {
  ok: "#2e8b57",
  warn: "#b8860b",
  alert: "#e07000",
  exceeded: "crimson",
};

export default function CostsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [meters, setMeters] = useState<FreeTierMeter[]>([]);
  const [snapshots, setSnapshots] = useState<CostSnapshot[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [advice, setAdvice] = useState<{
    suggestions: { project: string; name: string; recommendation?: string }[];
    rateCard: { asOf: string; stale: boolean };
  } | null>(null);

  const loadBudgets = () => api.getBudgets().then(setBudgets).catch(() => {});

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
      return;
    }
    if (session) {
      api.getMeters().then(setMeters).catch(() => {});
      api.getCostSnapshots().then(setSnapshots).catch(() => {});
      api.getCostAdvice().then(setAdvice).catch(() => {});
      loadBudgets();
    }
  }, [isPending, session, router]);

  const globalSnapshots = snapshots.filter((s) => s.scope === "global").slice(0, 5);

  if (isPending || !session) return null;

  return (
    <main className="container-app">
      <Link href="/projects" className="text-sm">
        ← Projects
      </Link>
      <h1 className="mt-2">Free-tier usage</h1>
      <p className="muted">
        Consumption against AWS always-free monthly allowances. Warn ≥80%, alert ≥95%.
      </p>

      <ul className="mt-4 space-y-3">
        {meters.map((m) => (
          <li key={`${m.service}:${m.metric}`} className="card">
            <div className="flex justify-between text-sm">
              <span>
                <strong>{m.service}</strong> · {m.metric}
              </span>
              <span style={{ color: STATUS_COLOR[m.status] }}>
                {m.used.toLocaleString()} / {m.limit.toLocaleString()} {m.unit} ({m.pct}%)
              </span>
            </div>
            <div style={{ background: "#eee", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, m.pct)}%`,
                  height: "100%",
                  background: STATUS_COLOR[m.status],
                }}
              />
            </div>
          </li>
        ))}
        {meters.length === 0 && <li style={{ color: "#888" }}>No meter data.</li>}
      </ul>

      {advice && (advice.suggestions.length > 0 || advice.rateCard.stale) && (
        <>
          <h2 className="mt-8">Suggestions</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {advice.suggestions.map((s) => (
              <li key={s.project} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
                <strong>{s.name}</strong>: {s.recommendation}
              </li>
            ))}
            {advice.rateCard.stale && (
              <li className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
                Pricing rate card (as of {advice.rateCard.asOf}) is &gt;90 days old — re-verify against
                official AWS pricing.
              </li>
            )}
          </ul>
        </>
      )}

      <h2 className="mt-8">Reconciled cost (Cost Explorer)</h2>
      <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {globalSnapshots.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{s.period} (all projects)</span>
            <span className="font-medium">${Number(s.actualUsd).toFixed(2)}</span>
          </li>
        ))}
        {globalSnapshots.length === 0 && (
          <li className="muted px-4 py-2">No snapshots yet (poller runs daily).</li>
        )}
      </ul>

      <h2 className="mt-8">Budgets</h2>
      <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {budgets.map((b) => (
          <li key={b.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>
              {b.scope}
              {b.refId ? ` · ${b.refId.slice(0, 8)}` : ""} — ${Number(b.thresholdUsd).toFixed(2)}/mo
            </span>
            <button className="btn btn-secondary" onClick={() => api.deleteBudget(b.id).then(loadBudgets)}>
              remove
            </button>
          </li>
        ))}
        {budgets.length === 0 && <li className="muted px-4 py-2">No budgets.</li>}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          api
            .createBudget({ scope: "global", thresholdUsd: Number(budgetAmount) })
            .then(() => {
              setBudgetAmount("");
              loadBudgets();
            })
            .catch(() => {});
        }}
      >
        <input
          className="input max-w-[10rem]"
          type="number"
          step="0.01"
          placeholder="global $/mo"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(e.target.value)}
          required
        />
        <button className="btn" type="submit">
          Set budget
        </button>
      </form>
    </main>
  );
}
