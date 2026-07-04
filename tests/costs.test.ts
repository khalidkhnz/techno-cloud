import { describe, expect, it } from "vitest";
import {
  FREE_TIER_METERS,
  estimateFargate,
  estimateLambda,
  meterStatus,
} from "@techno-deployer/costs";

describe("cost estimators", () => {
  it("lambda default load stays within the always-free tier", () => {
    const e = estimateLambda({ kind: "lambda" });
    expect(e.freeTierApplied).toBe(true);
    expect(e.monthlyHighUsd).toBe(0);
  });

  it("fargate 0.5 vCPU / 1 GB (arm64) ≈ $14.42/mo", () => {
    const e = estimateFargate({ kind: "ecs-fargate", vcpu: 0.5, memoryMb: 1024 });
    expect(e.monthlyHighUsd).toBeCloseTo(14.42, 1);
  });
});

describe("meterStatus", () => {
  it("classifies usage into ok/warn/alert/exceeded", () => {
    expect(meterStatus(0, 100).status).toBe("ok");
    expect(meterStatus(80, 100).status).toBe("warn");
    expect(meterStatus(96, 100).status).toBe("alert");
    expect(meterStatus(100, 100).status).toBe("exceeded");
  });

  it("has a lambda-requests meter at 1M", () => {
    const m = FREE_TIER_METERS.find((x) => x.service === "lambda" && x.metric === "requests");
    expect(m?.limit).toBe(1_000_000);
  });
});
