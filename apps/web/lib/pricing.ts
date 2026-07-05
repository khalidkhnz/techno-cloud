/**
 * Config-aware monthly cost estimate for the create flow — updates live as the user changes target
 * config (instance type, memory, CPU, storage, task count). Approximate us-east-1 on-demand rates;
 * the Costs module reconciles against Cost Explorer actuals after deploy.
 */

const HOURS = 730;
const EBS_GB_MONTH = 0.08; // gp3
const CF_NOTE = "near-free — free-tier CDN / scale-to-zero";

// On-demand hourly (us-east-1, approx).
const EC2_HOURLY: Record<string, number> = {
  "t3.micro": 0.0104,
  "t3.small": 0.0208,
  "t3.medium": 0.0416,
  "t3.large": 0.0832,
  "t4g.small": 0.0168,
  "t4g.medium": 0.0336,
};

export interface CostRange {
  low: number;
  high: number;
  note?: string;
}

type Cfg = Record<string, string | number | boolean>;

const num = (v: unknown, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};
const round = (n: number) => Math.round(n * 100) / 100;

export function estimateTargetCost(target: string, cfg: Cfg): CostRange {
  switch (target) {
    case "ec2": {
      if (cfg.mode === "existing") {
        return { low: 0, high: 0, note: "shares an existing instance — no new compute cost" };
      }
      const hourly = EC2_HOURLY[String(cfg.instanceType)] ?? EC2_HOURLY["t3.micro"]!;
      const monthly = hourly * HOURS + num(cfg.storageGb, 20) * EBS_GB_MONTH;
      return { low: round(monthly), high: round(monthly), note: "always-on (24/7)" };
    }
    case "ecs-fargate": {
      const vcpu = num(cfg.cpu, 512) / 1024;
      const memGb = num(cfg.memoryMb, 1024) / 1024;
      const count = num(cfg.desiredCount, 1);
      const monthly = (vcpu * 0.04048 + memGb * 0.004445) * HOURS * count;
      return { low: round(monthly * 0.9), high: round(monthly), note: "always-on (24/7)" };
    }
    case "apprunner": {
      const vcpu = num(cfg.cpu, 1);
      const memGb = num(cfg.memoryMb, 2048) / 1024;
      const active = (vcpu * 0.064 + memGb * 0.007) * HOURS;
      const idle = memGb * 0.007 * HOURS; // provisioned-but-idle memory only
      return { low: round(idle), high: round(active) };
    }
    case "lambda": {
      const memGb = num(cfg.memoryMb, 512) / 1024;
      return { low: 0, high: round(Math.max(1, memGb * 2)), note: "scales to zero — free tier covers light use" };
    }
    case "static-cdn":
    case "amplify":
      return { low: 0, high: 1, note: CF_NOTE };
    default:
      return { low: 0, high: 0 };
  }
}
