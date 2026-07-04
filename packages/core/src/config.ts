/**
 * Platform feature flags & limits. DB-backed (PlatformConfig table) and admin-editable,
 * with per-project overrides. Drivers MUST check these before provisioning — every flag
 * maps to real cost (see COST_BREAKDOWN.md §6).
 */

export type DeployTargetKind =
  | "lambda"
  | "amplify"
  | "static-cdn"
  | "apprunner"
  | "ecs-fargate"
  | "ec2";

export type SourceProviderKind = "github" | "gitlab" | "bitbucket" | "zip";

export interface TargetFlags {
  lambda: boolean;
  amplify: boolean;
  staticCdn: boolean;
  appRunner: boolean;
  ecsFargate: boolean;
  ec2: boolean;
}

export interface RoutingFlags {
  subdomains: boolean;
  customDomains: boolean;
  previews: boolean;
}

export interface PlatformLimits {
  maxConcurrentBuilds: number;
  previewTtlHours: number;
  maxAppsPerTeam: number;
}

export interface PlatformConfig {
  targets: TargetFlags;
  routing: RoutingFlags;
  limits: PlatformLimits;
}

/** Maps a target kind to its feature-flag key. */
export const TARGET_FLAG_KEY: Record<DeployTargetKind, keyof TargetFlags> = {
  lambda: "lambda",
  amplify: "amplify",
  "static-cdn": "staticCdn",
  apprunner: "appRunner",
  "ecs-fargate": "ecsFargate",
  ec2: "ec2",
};

/** Targets that do NOT scale to zero (always-on cost) — surfaced as a cost warning. */
export const ALWAYS_ON_TARGETS: DeployTargetKind[] = ["apprunner", "ecs-fargate", "ec2"];

/** Presentation metadata for deploy targets — single source of truth for the master-data API. */
export const TARGET_META: Record<DeployTargetKind, { label: string; description: string }> = {
  lambda: { label: "Lambda", description: "Serverless functions / APIs (arm64) — scales to zero." },
  amplify: { label: "Amplify", description: "Next.js SSR / static web — managed hosting." },
  "static-cdn": { label: "Static / CDN", description: "S3 + CloudFront for SPAs / static sites." },
  apprunner: { label: "App Runner", description: "Simple always-on containers." },
  "ecs-fargate": { label: "ECS Fargate", description: "Long-running containers." },
  ec2: { label: "EC2", description: "Full VM control (GPU / licensed workloads)." },
};

export function isTargetEnabled(config: PlatformConfig, kind: DeployTargetKind): boolean {
  return config.targets[TARGET_FLAG_KEY[kind]];
}

export function enabledTargets(config: PlatformConfig): DeployTargetKind[] {
  return (Object.keys(TARGET_FLAG_KEY) as DeployTargetKind[]).filter((k) =>
    isTargetEnabled(config, k),
  );
}

/** All deploy targets enabled by default; admins can disable always-on targets via PlatformConfig. */
export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  targets: {
    lambda: true,
    amplify: true,
    staticCdn: true,
    appRunner: true,
    ecsFargate: true,
    ec2: true,
  },
  routing: {
    subdomains: true,
    customDomains: false,
    previews: false,
  },
  limits: {
    maxConcurrentBuilds: 20,
    previewTtlHours: 72,
    maxAppsPerTeam: 50,
  },
};
