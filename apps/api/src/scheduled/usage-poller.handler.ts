/**
 * Usage poller — EventBridge Scheduler → Lambda (e.g. hourly). Reads current-month usage from
 * CloudWatch and upserts the free-tier meters so the /costs dashboard + alerts reflect reality.
 * Extend `SOURCES` as more metrics are wired. See COSTS_MODULE.md.
 */

import { and, db, eq, freeTierMeters } from "@techno-deployer/db";
import { FREE_TIER_METERS, meterKey } from "@techno-deployer/costs";
import { getMetricSum } from "@techno-deployer/aws";

interface MetricSource {
  service: string;
  metric: string;
  namespace: string;
  metricName: string;
}

// CloudWatch metric → free-tier meter mappings (account-wide sums this month).
const SOURCES: MetricSource[] = [
  { service: "lambda", metric: "requests", namespace: "AWS/Lambda", metricName: "Invocations" },
];

async function upsert(service: string, metric: string, used: number): Promise<void> {
  const def = FREE_TIER_METERS.find((m) => m.service === service && m.metric === metric);
  const [existing] = await db
    .select()
    .from(freeTierMeters)
    .where(and(eq(freeTierMeters.service, service), eq(freeTierMeters.metric, metric)));
  if (existing) {
    await db
      .update(freeTierMeters)
      .set({ usedQty: String(used) })
      .where(eq(freeTierMeters.id, existing.id));
  } else {
    await db.insert(freeTierMeters).values({
      service,
      metric,
      limitQty: String(def?.limit ?? 0),
      usedQty: String(used),
      unit: def?.unit ?? "",
      window: def?.window ?? "monthly",
    });
  }
}

export const handler = async (): Promise<{ polled: string[] }> => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const polled: string[] = [];
  for (const s of SOURCES) {
    const sum = await getMetricSum(s.namespace, s.metricName, [], monthStart, now);
    await upsert(s.service, s.metric, sum);
    polled.push(meterKey(s.service, s.metric));
  }
  return { polled };
};
