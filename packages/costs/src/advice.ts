/**
 * Cost advice — pure suggestions surfaced in the UI. Rightsizing flags always-on targets that
 * could scale to zero; rate-card staleness flags when the verified pricing needs re-checking.
 * See COSTS_MODULE.md §v3.
 */

import { ALWAYS_ON_TARGETS, type DeployTargetKind } from "@techno-deployer/core";

export interface RightsizingSuggestion {
  target: DeployTargetKind;
  recommendation: string;
}

/** Suggest a cheaper target for always-on workloads; null if already serverless. */
export function suggestRightsizing(target: DeployTargetKind): RightsizingSuggestion | null {
  if (ALWAYS_ON_TARGETS.includes(target)) {
    return {
      target,
      recommendation: `"${target}" is always-on (billed 24/7). If traffic is bursty or low, move to Lambda or Static-CDN to scale to zero.`,
    };
  }
  return null;
}

/** True if the rate card (AS_OF date) is older than maxDays — time to re-verify pricing. */
export function isRateCardStale(asOf: string, nowMs: number, maxDays = 90): boolean {
  const asOfMs = Date.parse(asOf);
  if (Number.isNaN(asOfMs)) return true;
  return (nowMs - asOfMs) / 86_400_000 > maxDays;
}
