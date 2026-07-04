/**
 * Cost snapshot + budget check — EventBridge Scheduler → Lambda (daily). Pulls month-to-date
 * actuals from Cost Explorer (grouped by td:project), stores a CostSnapshot per project, and emails
 * the admin when any enabled budget is exceeded. See COSTS_MODULE.md §2/§6.
 */

import { budgets, costSnapshots, db, eq } from "@techno-deployer/db";
import { getCostByProject } from "@techno-deployer/aws";
import { env } from "@techno-deployer/env";
import { sendAlertEmail } from "../auth/mailer.js";

export const handler = async (): Promise<{ projects: number; breaches: number }> => {
  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const start = `${period}-01`;
  const end = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);

  const byProject = await getCostByProject(start, end);

  for (const [projectId, actual] of Object.entries(byProject)) {
    await db.insert(costSnapshots).values({
      scope: "project",
      refId: projectId,
      actualUsd: actual.toFixed(4),
      period,
    });
  }

  const total = Object.values(byProject).reduce((sum, n) => sum + n, 0);
  await db.insert(costSnapshots).values({ scope: "global", actualUsd: total.toFixed(4), period });

  let breaches = 0;
  const active = await db.select().from(budgets).where(eq(budgets.enabled, true));
  for (const budget of active) {
    const actual =
      budget.scope === "project" ? (byProject[budget.refId ?? ""] ?? 0) : total;
    if (actual >= Number(budget.thresholdUsd)) {
      breaches += 1;
      if (env.ADMIN_EMAIL) {
        await sendAlertEmail(
          env.ADMIN_EMAIL,
          `Budget exceeded (${budget.scope}${budget.refId ? ` ${budget.refId}` : ""})`,
          `Actual $${actual.toFixed(2)} ≥ budget $${budget.thresholdUsd} for ${period}.`,
        ).catch(() => {});
      }
    }
  }

  return { projects: Object.keys(byProject).length, breaches };
};
