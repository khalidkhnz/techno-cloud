/**
 * Cost Explorer reader — reconciles estimates against actuals, grouped by the `td:project` tag
 * (see appTags). Cost Explorer API calls cost $0.01 each, so the poller caches daily. Fail-soft.
 */

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";

const region = process.env.AWS_REGION ?? "us-east-1";
const client = new CostExplorerClient({ region });

/** Returns month-to-date unblended cost (USD) per project id, keyed by the td:project tag value. */
export async function getCostByProject(
  start: string, // YYYY-MM-DD
  end: string, // YYYY-MM-DD (exclusive)
): Promise<Record<string, number>> {
  try {
    const res = await client.send(
      new GetCostAndUsageCommand({
        TimePeriod: { Start: start, End: end },
        Granularity: "MONTHLY",
        Metrics: ["UnblendedCost"],
        GroupBy: [{ Type: "TAG", Key: "td:project" }],
      }),
    );
    const out: Record<string, number> = {};
    for (const period of res.ResultsByTime ?? []) {
      for (const group of period.Groups ?? []) {
        // Key looks like "td:project$<projectId>"
        const raw = group.Keys?.[0] ?? "";
        const projectId = raw.includes("$") ? raw.slice(raw.indexOf("$") + 1) : raw;
        const amount = Number(group.Metrics?.UnblendedCost?.Amount ?? "0");
        if (projectId) out[projectId] = (out[projectId] ?? 0) + amount;
      }
    }
    return out;
  } catch {
    return {};
  }
}
