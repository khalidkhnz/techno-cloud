import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_CONFIG, enabledTargets, isTargetEnabled } from "@techno-deployer/core";

describe("platform config flags", () => {
  it("enables serverless targets by default, disables always-on", () => {
    expect(isTargetEnabled(DEFAULT_PLATFORM_CONFIG, "lambda")).toBe(true);
    expect(isTargetEnabled(DEFAULT_PLATFORM_CONFIG, "amplify")).toBe(true);
    expect(isTargetEnabled(DEFAULT_PLATFORM_CONFIG, "ec2")).toBe(false);
    expect(isTargetEnabled(DEFAULT_PLATFORM_CONFIG, "ecs-fargate")).toBe(false);
  });

  it("enabledTargets returns only the on targets", () => {
    const on = enabledTargets(DEFAULT_PLATFORM_CONFIG);
    expect(on).toContain("lambda");
    expect(on).toContain("static-cdn");
    expect(on).not.toContain("ec2");
  });
});
