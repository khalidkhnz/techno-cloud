/**
 * Cost estimation types. See COSTS_MODULE.md and PRICING_REFERENCE.md.
 * Estimates are always ranges (low/high) — never single false-precision numbers.
 */

export interface CostLineItem {
  service: string; // e.g. "lambda", "fargate", "cloudfront"
  sku: string; // e.g. "gb-second-arm64"
  quantity: number;
  unit: string; // e.g. "GB-s", "vCPU-hr"
  unitPriceUsd: number;
  monthlyUsd: number;
  freeTierApplied?: boolean;
}

export interface CostEstimate {
  monthlyLowUsd: number;
  monthlyHighUsd: number;
  breakdown: CostLineItem[];
  /** True if any free-tier allowance was subtracted from this estimate. */
  freeTierApplied: boolean;
  /** Rate-card date the estimate was computed against (from PRICING_REFERENCE.md). */
  ratesAsOf: string;
}
