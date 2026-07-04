/**
 * Free-tier meters — track consumption against the always-free monthly allowances so the
 * platform can warn BEFORE it starts getting billed. Pure logic here; usage numbers are fed
 * in from CloudWatch/Neon (that ingestion is a separate, AWS-dependent step). See COSTS_MODULE.md.
 */

import { FREE_TIER } from "./rates.js";

export type MeterStatus = "ok" | "warn" | "alert" | "exceeded";
export type MeterWindow = "monthly" | "12mo" | "free-plan";

export interface MeterDef {
  service: string;
  metric: string;
  limit: number;
  unit: string;
  window: MeterWindow;
}

/** Thresholds: warn ≥80%, alert ≥95%, exceeded ≥100%. */
export function meterStatus(used: number, limit: number): { pct: number; status: MeterStatus } {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 1000) / 10) : 0;
  const status: MeterStatus =
    limit > 0 && used >= limit ? "exceeded" : pct >= 95 ? "alert" : pct >= 80 ? "warn" : "ok";
  return { pct, status };
}

/** Catalog of always-free meters derived from the verified FREE_TIER allowances. */
export const FREE_TIER_METERS: MeterDef[] = [
  { service: "lambda", metric: "requests", limit: FREE_TIER.lambdaRequests, unit: "requests", window: "monthly" },
  { service: "lambda", metric: "gb-seconds", limit: FREE_TIER.lambdaGbSeconds, unit: "GB-s", window: "monthly" },
  { service: "sqs", metric: "requests", limit: FREE_TIER.sqsRequests, unit: "requests", window: "monthly" },
  { service: "dynamodb", metric: "storage", limit: FREE_TIER.dynamoStorageGb, unit: "GB", window: "monthly" },
  { service: "cloudwatch", metric: "ingest", limit: FREE_TIER.cloudwatchIngestGb, unit: "GB", window: "monthly" },
  { service: "codebuild", metric: "build-minutes", limit: FREE_TIER.codeBuildMinutes, unit: "min", window: "monthly" },
  { service: "eventbridge", metric: "invocations", limit: FREE_TIER.eventbridgeSchedulerInvocations, unit: "invocations", window: "monthly" },
  { service: "cloudfront", metric: "data-out", limit: FREE_TIER.cloudfrontDataOutGb, unit: "GB", window: "monthly" },
  { service: "cloudfront", metric: "requests", limit: FREE_TIER.cloudfrontRequests, unit: "requests", window: "monthly" },
];

export function meterKey(service: string, metric: string): string {
  return `${service}:${metric}`;
}
