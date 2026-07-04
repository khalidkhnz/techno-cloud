import { describe, expect, it } from "vitest";
import { buildPlan, detectFramework } from "@techno-deployer/core";

describe("detectFramework", () => {
  it("recommends amplify for Next.js", () => {
    const d = detectFramework({ files: ["package.json"], packageJson: { dependencies: { next: "15" } } });
    expect(d.recommendedTarget).toBe("amplify");
  });

  it("recommends static-cdn for Vite", () => {
    const d = detectFramework({ files: ["package.json"], packageJson: { devDependencies: { vite: "5" } } });
    expect(d.recommendedTarget).toBe("static-cdn");
  });

  it("recommends lambda for a Node API", () => {
    const d = detectFramework({ files: ["package.json"], packageJson: { dependencies: { express: "4" } } });
    expect(d.recommendedTarget).toBe("lambda");
  });

  it("uses dockerfile strategy when a Dockerfile is present", () => {
    const d = detectFramework({ files: ["Dockerfile"] });
    expect(d.recommendedTarget).toBe("lambda");
    expect(d.buildStrategy).toBe("dockerfile");
  });

  it("falls back to lambda + nixpacks", () => {
    const d = detectFramework({ files: ["README.md"] });
    expect(d.recommendedTarget).toBe("lambda");
    expect(d.buildStrategy).toBe("nixpacks");
  });
});

describe("buildPlan", () => {
  it("describes the docker build for a Dockerfile", () => {
    const plan = buildPlan(detectFramework({ files: ["Dockerfile"] }));
    expect(plan.strategy).toBe("dockerfile");
    expect(plan.steps.some((s) => s.command?.includes("docker build"))).toBe(true);
  });

  it("describes Nixpacks steps and honors custom commands", () => {
    const plan = buildPlan(detectFramework({ files: ["README.md"] }), {
      buildCommand: "make build",
      startCommand: "./run",
    });
    expect(plan.strategy).toBe("nixpacks");
    expect(plan.steps.some((s) => s.command === "make build")).toBe(true);
    expect(plan.steps.some((s) => s.command === "./run")).toBe(true);
  });

  it("describes a static export to S3/CloudFront", () => {
    const plan = buildPlan(
      detectFramework({ files: ["package.json"], packageJson: { devDependencies: { vite: "5" } } }),
    );
    expect(plan.strategy).toBe("static");
    expect(plan.steps.some((s) => s.label.includes("S3"))).toBe(true);
  });
});
