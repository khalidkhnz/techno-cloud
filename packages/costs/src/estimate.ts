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

/** Static site on S3 + CloudFront. Near-free — CloudFront 1 TB out + 10M req always-free. */
export function estimateStaticCdn(cfg: TargetConfig): CostEstimate {
  const storageGb = cfg.storageGb ?? 1;
  return estimate([
    {
      service: "s3",
      sku: "storage",
      quantity: storageGb,
      unit: "GB-month",
      unitPriceUsd: RATES.s3StorageGbMonth.priceUsd,
      monthlyUsd: round(storageGb * RATES.s3StorageGbMonth.priceUsd),
    },
    {
      service: "cloudfront",
      sku: "data-out",
      quantity: 0,
      unit: "GB",
      unitPriceUsd: RATES.cloudfrontDataOutGb.priceUsd,
      monthlyUsd: 0, // within the 1 TB/mo always-free tier for low-traffic internal sites
      freeTierApplied: true,
    },
  ]);
}

/** App Runner: memory billed while provisioned (no scale-to-zero) + active vCPU. */
export function estimateAppRunner(cfg: TargetConfig): CostEstimate {
  const vcpu = cfg.vcpu ?? 1;
  const memGb = (cfg.memoryMb ?? 2048) / 1024;
  // Memory billed for the full month on the min provisioned instance; vCPU only while active —
  // assume ~30% active duty for a low-traffic internal service.
  const activeHours = HOURS_PER_MONTH * 0.3;
  return estimate([
    {
      service: "apprunner",
      sku: "memory",
      quantity: round(memGb * HOURS_PER_MONTH),
      unit: "GB-hr",
      unitPriceUsd: RATES.appRunnerGbHr.priceUsd,
      monthlyUsd: round(memGb * HOURS_PER_MONTH * RATES.appRunnerGbHr.priceUsd),
    },
    {
      service: "apprunner",
      sku: "vcpu-active",
      quantity: round(vcpu * activeHours),
      unit: "vCPU-hr",
      unitPriceUsd: RATES.appRunnerVcpuHr.priceUsd,
      monthlyUsd: round(vcpu * activeHours * RATES.appRunnerVcpuHr.priceUsd),
    },
  ]);
}

/** Amplify Hosting: 12-month free tier, then usage-based. Low-traffic internal ≈ $0–5/mo. */
export function estimateAmplify(_cfg: TargetConfig): CostEstimate {
  return {
    monthlyLowUsd: 0,
    monthlyHighUsd: 5,
    breakdown: [
      {
        service: "amplify",
        sku: "hosting",
        quantity: 1,
        unit: "app",
        unitPriceUsd: 0,
        monthlyUsd: 0,
        freeTierApplied: true,
      },
    ],
    freeTierApplied: true,
    ratesAsOf: AS_OF,
  };
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
