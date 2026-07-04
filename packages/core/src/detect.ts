/**
 * Framework detection → recommended deploy target + build strategy. Pure logic over a
 * lightweight inspection of the repo (top-level files + package.json). Used to pre-select a
 * target in the UI; the actual build strategy is applied by CodeBuild. See PHASE2 §2.
 */

import type { DeployTargetKind } from "./config.js";

export interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface SourceInspection {
  /** Top-level file names present in the repo root (e.g. ["Dockerfile", "package.json"]). */
  files: string[];
  packageJson?: PackageJsonLike;
}

export type BuildStrategy = "dockerfile" | "nixpacks" | "static";

export interface FrameworkDetection {
  framework: string;
  recommendedTarget: DeployTargetKind;
  buildStrategy: BuildStrategy;
  reason: string;
}

function hasDep(pkg: PackageJsonLike | undefined, name: string): boolean {
  if (!pkg) return false;
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

/**
 * Precedence: explicit Dockerfile sets the build strategy but the target still follows the
 * detected framework. Framework detection prefers the most specific signal.
 */
export function detectFramework(input: SourceInspection): FrameworkDetection {
  const { files, packageJson: pkg } = input;
  const hasDockerfile = files.includes("Dockerfile");
  const dockerStrategy: BuildStrategy = hasDockerfile ? "dockerfile" : "nixpacks";

  // Next.js → Amplify (managed SSR + CDN + TLS).
  if (hasDep(pkg, "next")) {
    return {
      framework: "next",
      recommendedTarget: "amplify",
      buildStrategy: hasDockerfile ? "dockerfile" : "nixpacks",
      reason: "Next.js detected — Amplify handles SSR build, hosting, CDN, and TLS.",
    };
  }

  // Static SPAs (Vite / CRA / plain index.html) → S3 + CloudFront.
  const isVite = hasDep(pkg, "vite");
  const isCra = hasDep(pkg, "react-scripts");
  const isPlainStatic = files.includes("index.html") && !pkg;
  if (isVite || isCra || isPlainStatic) {
    return {
      framework: isVite ? "vite" : isCra ? "create-react-app" : "static",
      recommendedTarget: "static-cdn",
      buildStrategy: isPlainStatic ? "static" : "static",
      reason: "Static/SPA build — served cheaply from S3 + CloudFront (1 TB/mo free).",
    };
  }

  // Node API frameworks → Lambda (scale-to-zero).
  if (hasDep(pkg, "express") || hasDep(pkg, "fastify") || hasDep(pkg, "@nestjs/core")) {
    return {
      framework: "node-api",
      recommendedTarget: "lambda",
      buildStrategy: dockerStrategy,
      reason: "Node API detected — Lambda (arm64) scales to zero for bursty internal APIs.",
    };
  }

  // Generic Dockerfile with no clearer signal → containerized on Lambda (image, scale-to-zero).
  if (hasDockerfile) {
    return {
      framework: "docker",
      recommendedTarget: "lambda",
      buildStrategy: "dockerfile",
      reason: "Dockerfile present — deploy as a Lambda container image (scale-to-zero).",
    };
  }

  // Fallback.
  return {
    framework: "unknown",
    recommendedTarget: "lambda",
    buildStrategy: "nixpacks",
    reason: "No strong signal — defaulting to Lambda via Nixpacks; override in project settings.",
  };
}
