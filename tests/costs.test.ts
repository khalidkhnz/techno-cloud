import { describe, expect, it } from "vitest";
import {
  FREE_TIER_METERS,
  estimateFargate,
  estimateLambda,
  isBreached,
  isRateCardStale,
  meterStatus,
  suggestRightsizing,
  summarizeAlerts,
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

describe("alert evaluation", () => {
  it("flags any non-ok status as breached", () => {
    expect(isBreached("ok")).toBe(false);
    expect(isBreached("warn")).toBe(true);
    expect(isBreached("exceeded")).toBe(true);
  });

  it("summarizes counts across statuses", () => {
    const s = summarizeAlerts([
      { status: "ok" },
      { status: "warn" },
      { status: "warn" },
      { status: "alert" },
      { status: "exceeded" },
    ]);
    expect(s).toEqual({ warn: 2, alert: 1, exceeded: 1, breached: 4 });
  });
});

describe("cost advice", () => {
  it("flags always-on targets, not serverless ones", () => {
    expect(suggestRightsizing("ecs-fargate")).not.toBeNull();
    expect(suggestRightsizing("ec2")).not.toBeNull();
    expect(suggestRightsizing("apprunner")).not.toBeNull();
    expect(suggestRightsizing("lambda")).toBeNull();
    expect(suggestRightsizing("static-cdn")).toBeNull();
    expect(suggestRightsizing("amplify")).toBeNull();
  });

  it("detects a stale rate card", () => {
    expect(isRateCardStale("2026-07-04", Date.parse("2026-07-10"), 90)).toBe(false);
    expect(isRateCardStale("2026-01-01", Date.parse("2026-07-04"), 90)).toBe(true);
    expect(isRateCardStale("not-a-date", Date.parse("2026-07-04"))).toBe(true);
  });
});
