"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type FreeTierMeter } from "../../lib/api";
import { useSession } from "../../lib/auth-client";

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

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
      return;
    }
    if (session) api.getMeters().then(setMeters).catch(() => {});
  }, [isPending, session, router]);

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
    </main>
  );
}
