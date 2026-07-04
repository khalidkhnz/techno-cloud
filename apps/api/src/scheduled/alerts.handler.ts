/**
 * Free-tier alert handler — EventBridge Scheduler → Lambda (e.g. hourly). Evaluates meter status
 * and emails the admin when any meter is in warn/alert/exceeded. See COSTS_MODULE.md §6.
 */

import { db, freeTierMeters } from "@techno-deployer/db";
import { FREE_TIER_METERS, meterKey, meterStatus, summarizeAlerts } from "@techno-deployer/costs";
import { env } from "@techno-deployer/env";
import { sendAlertEmail } from "../auth/mailer.js";

export const handler = async (): Promise<{ breached: number }> => {
  const rows = await db.select().from(freeTierMeters);
  const used = new Map(rows.map((r) => [meterKey(r.service, r.metric), Number(r.usedQty)]));

  const items = FREE_TIER_METERS.map((m) => {
    const u = used.get(meterKey(m.service, m.metric)) ?? 0;
    return { ...m, used: u, ...meterStatus(u, m.limit) };
  });

  const breached = items.filter((i) => i.status !== "ok");
  const summary = summarizeAlerts(items);

  if (breached.length > 0 && env.ADMIN_EMAIL) {
    const body = breached
      .map((b) => `${b.service}:${b.metric} — ${b.used}/${b.limit} ${b.unit} (${b.pct}%, ${b.status})`)
      .join("\n");
    await sendAlertEmail(
      env.ADMIN_EMAIL,
      `Techno-Deployer free-tier alert: ${summary.breached} meter(s) breached`,
      body,
    );
  }

  return { breached: breached.length };
};
