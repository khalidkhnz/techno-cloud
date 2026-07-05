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
  /** Targets this framework can deploy to — used to filter the target picker after detection. */
  supportedTargets: DeployTargetKind[];
}

const ALL_TARGETS: DeployTargetKind[] = [
  "lambda",
  "amplify",
  "static-cdn",
  "apprunner",
  "ecs-fargate",
  "ec2",
];

const NEXT_TARGETS: DeployTargetKind[] = ["amplify", "lambda", "ecs-fargate", "apprunner"];
const SPA_TARGETS: DeployTargetKind[] = ["static-cdn", "amplify"];
const CONTAINER_TARGETS: DeployTargetKind[] = ["lambda", "ecs-fargate", "apprunner", "ec2"];

/** Which targets each detected framework can deploy to. */
const SUPPORTED: Record<string, DeployTargetKind[]> = {
  next: NEXT_TARGETS,
  vite: SPA_TARGETS,
  "create-react-app": SPA_TARGETS,
  static: ["static-cdn"],
  "node-api": CONTAINER_TARGETS,
  docker: CONTAINER_TARGETS,
  unknown: ALL_TARGETS,
};

/** Manually-selectable project types (when auto-detection fails or is overridden). */
export interface ProjectType {
  id: string;
  label: string;
  supportedTargets: DeployTargetKind[];
  recommendedTarget: DeployTargetKind;
  buildStrategy: BuildStrategy;
}

export const PROJECT_TYPES: ProjectType[] = [
  { id: "next", label: "Next.js", supportedTargets: NEXT_TARGETS, recommendedTarget: "amplify", buildStrategy: "nixpacks" },
  { id: "spa", label: "Static site / SPA (Vite, CRA)", supportedTargets: SPA_TARGETS, recommendedTarget: "static-cdn", buildStrategy: "static" },
  { id: "static", label: "Plain static HTML", supportedTargets: ["static-cdn"], recommendedTarget: "static-cdn", buildStrategy: "static" },
  { id: "node-api", label: "Node API (Express / Nest / Fastify)", supportedTargets: CONTAINER_TARGETS, recommendedTarget: "lambda", buildStrategy: "nixpacks" },
  { id: "docker", label: "Docker (has a Dockerfile)", supportedTargets: CONTAINER_TARGETS, recommendedTarget: "lambda", buildStrategy: "dockerfile" },
  { id: "other", label: "Other / custom", supportedTargets: ALL_TARGETS, recommendedTarget: "lambda", buildStrategy: "nixpacks" },
];

function hasDep(pkg: PackageJsonLike | undefined, name: string): boolean {
  if (!pkg) return false;
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

/**
 * Precedence: explicit Dockerfile sets the build strategy but the target still follows the
 * detected framework. Framework detection prefers the most specific signal.
 */
type DetectionBase = Omit<FrameworkDetection, "supportedTargets">;

/** Attaches the supported-target list for the detected framework. */
export function detectFramework(input: SourceInspection): FrameworkDetection {
  const base = detectFrameworkBase(input);
  return { ...base, supportedTargets: SUPPORTED[base.framework] ?? ALL_TARGETS };
}

function detectFrameworkBase(input: SourceInspection): DetectionBase {
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

export interface BuildStep {
  label: string;
  command?: string;
}

export interface BuildPlan {
  strategy: BuildStrategy;
  title: string;
  steps: BuildStep[];
}

export interface BuildCommands {
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
}

/**
 * Human-readable build plan for a detection — mirrors the CodeBuild buildspec
 * (Dockerfile-first → Nixpacks fallback; static export → S3/CloudFront). Surfaced in the UI so
 * users see exactly which Docker/build steps will run.
 */
export function buildPlan(detection: FrameworkDetection, cmds?: BuildCommands): BuildPlan {
  if (detection.buildStrategy === "dockerfile") {
    return {
      strategy: "dockerfile",
      title: "Docker — Dockerfile detected",
      steps: [
        { label: "Build image from your Dockerfile", command: "docker build -t <image> ." },
        { label: "Push image to ECR", command: "docker push <image>" },
        { label: "Provision the deploy target with the image (Pulumi)" },
      ],
    };
  }

  if (detection.buildStrategy === "static") {
    return {
      strategy: "static",
      title: "Static export → S3 + CloudFront",
      steps: [
        { label: "Install dependencies", command: cmds?.installCommand ?? "auto (npm / pnpm / yarn)" },
        { label: "Build static assets", command: cmds?.buildCommand ?? "auto (build script)" },
        { label: "Upload to S3 and invalidate CloudFront" },
      ],
    };
  }

  return {
    strategy: "nixpacks",
    title: "Nixpacks — no Dockerfile",
    steps: [
      { label: "Detect toolchain & install", command: cmds?.installCommand ?? "auto (Nixpacks)" },
      { label: "Build", command: cmds?.buildCommand ?? "auto (Nixpacks / build script)" },
      { label: "Package image & push to ECR" },
      ...(cmds?.startCommand ? [{ label: "Start", command: cmds.startCommand }] : []),
    ],
  };
}
