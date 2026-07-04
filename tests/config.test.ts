import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_CONFIG, enabledTargets, isTargetEnabled } from "@techno-deployer/core";

describe("platform config flags", () => {
  it("enables every deploy target by default (admin can disable always-on)", () => {
    expect(isTargetEnabled(DEFAULT_PLATFORM_CONFIG, "lambda")).toBe(true);
    expect(isTargetEnabled(DEFAULT_PLATFORM_CONFIG, "amplify")).toBe(true);
    expect(isTargetEnabled(DEFAULT_PLATFORM_CONFIG, "ec2")).toBe(true);
    expect(isTargetEnabled(DEFAULT_PLATFORM_CONFIG, "ecs-fargate")).toBe(true);
  });

  it("enabledTargets returns all six targets by default", () => {
    const on = enabledTargets(DEFAULT_PLATFORM_CONFIG);
    expect(on).toContain("lambda");
    expect(on).toContain("static-cdn");
    expect(on).toContain("ec2");
    expect(on).toHaveLength(6);
  });

  it("respects a disabled target", () => {
    const config = {
      ...DEFAULT_PLATFORM_CONFIG,
      targets: { ...DEFAULT_PLATFORM_CONFIG.targets, ec2: false },
    };
    expect(isTargetEnabled(config, "ec2")).toBe(false);
    expect(enabledTargets(config)).not.toContain("ec2");
  });
});
