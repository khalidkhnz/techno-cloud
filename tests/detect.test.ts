import { describe, expect, it } from "vitest";
import { detectFramework } from "@techno-deployer/core";

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
