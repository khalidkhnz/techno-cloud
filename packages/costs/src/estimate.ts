/**
 * Cost estimators per target. Pure functions over TargetConfig → CostEstimate.
 * Free-tier allowances are applied where the target is the platform's only consumer;
 * at scale the Costs Module reconciles against actuals (see COSTS_MODULE.md).
 */

import type { CostEstimate, CostLineItem, TargetConfig } from "@techno-deployer/core";
import { AS_OF, FREE_TIER, HOURS_PER_MONTH, RATES } from "./rates.js";

function estimate(breakdown: CostLineItem[], slackLowPct = 0): CostEstimate {
  const monthly = breakdown.reduce((sum, li) => sum + li.monthlyUsd, 0);
  return {
    monthlyLowUsd: round(monthly * (1 - slackLowPct)),
    monthlyHighUsd: round(monthly),
    breakdown,
    freeTierApplied: breakdown.some((li) => li.freeTierApplied),
    ratesAsOf: AS_OF,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Lambda (arm64). Applies always-free request + GB-s allowances. */
export function estimateLambda(cfg: TargetConfig): CostEstimate {
  const reqs = cfg.expectedRequestsPerMonth ?? 1_000_000;
  const memGb = (cfg.memoryMb ?? 512) / 1024;
  const durationS = 0.2; // assume 200ms avg; refined by real metrics later
  const gbSeconds = reqs * durationS * memGb;

  const billableReqs = Math.max(0, reqs - FREE_TIER.lambdaRequests);
  const billableGbS = Math.max(0, gbSeconds - FREE_TIER.lambdaGbSeconds);

  return estimate([
    {
      service: "lambda",
      sku: "requests",
      quantity: reqs,
      unit: "requests",
      unitPriceUsd: RATES.lambdaRequests.priceUsd,
      monthlyUsd: round((billableReqs / 1_000_000) * RATES.lambdaRequests.priceUsd),
      freeTierApplied: billableReqs < reqs,
    },
    {
      service: "lambda",
      sku: "gb-second-arm64",
      quantity: round(gbSeconds),
      unit: "GB-s",
      unitPriceUsd: RATES.lambdaGbSecondArm.priceUsd,
      monthlyUsd: round(billableGbS * RATES.lambdaGbSecondArm.priceUsd),
      freeTierApplied: billableGbS < gbSeconds,
    },
  ]);
}

/** ECS Fargate (arm64), always-on task. */
export function estimateFargate(cfg: TargetConfig): CostEstimate {
  const vcpu = cfg.vcpu ?? 0.5;
  const memGb = (cfg.memoryMb ?? 1024) / 1024;
  return estimate([
    {
      service: "fargate",
      sku: "vcpu-hr-arm64",
      quantity: round(vcpu * HOURS_PER_MONTH),
      unit: "vCPU-hr",
      unitPriceUsd: RATES.fargateVcpuHrArm.priceUsd,
      monthlyUsd: round(vcpu * HOURS_PER_MONTH * RATES.fargateVcpuHrArm.priceUsd),
    },
    {
      service: "fargate",
      sku: "gb-hr-arm64",
      quantity: round(memGb * HOURS_PER_MONTH),
      unit: "GB-hr",
      unitPriceUsd: RATES.fargateGbHrArm.priceUsd,
      monthlyUsd: round(memGb * HOURS_PER_MONTH * RATES.fargateGbHrArm.priceUsd),
    },
  ]);
}

/** EC2 (arm/Graviton), always-on instance + gp3 root volume. */
export function estimateEc2(cfg: TargetConfig): CostEstimate {
  const hourly =
    cfg.instanceType === "t4g.medium"
      ? RATES.ec2T4gMediumHr.priceUsd
      : RATES.ec2T4gSmallHr.priceUsd;
  const storageGb = cfg.storageGb ?? 20;
  return estimate([
    {
      service: "ec2",
      sku: cfg.instanceType ?? "t4g.small",
      quantity: HOURS_PER_MONTH,
      unit: "hr",
      unitPriceUsd: hourly,
      monthlyUsd: round(hourly * HOURS_PER_MONTH),
    },
    {
      service: "ebs",
      sku: "gp3",
      quantity: storageGb,
      unit: "GB-month",
      unitPriceUsd: RATES.ebsGp3GbMonth.priceUsd,
      monthlyUsd: round(storageGb * RATES.ebsGp3GbMonth.priceUsd),
    },
  ]);
}
