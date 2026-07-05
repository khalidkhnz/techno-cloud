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

// --- Per-target configuration schema (drives the dynamic config form in the create flow) ---

export interface TargetConfigOption {
  label: string;
  value: string;
}

export interface TargetConfigField {
  key: string;
  label: string;
  type: "select" | "number" | "text" | "boolean";
  default?: string | number | boolean;
  options?: TargetConfigOption[];
  help?: string;
  unit?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  /** Only show this field when another field's value matches (conditional config). */
  showIf?: { key: string; equals: string };
}

const opts = (values: (string | number)[]): TargetConfigOption[] =>
  values.map((v) => ({ label: String(v), value: String(v) }));

const mb = (values: number[]): TargetConfigOption[] =>
  values.map((v) => ({ label: `${v} MB`, value: String(v) }));

/** Config fields offered per deploy target — rendered dynamically after the target is chosen. */
export const TARGET_CONFIG_SCHEMA: Record<DeployTargetKind, TargetConfigField[]> = {
  lambda: [
    { key: "memoryMb", label: "Memory", type: "select", default: "512", unit: "MB", options: mb([128, 256, 512, 1024, 2048, 3008]) },
    { key: "timeoutSec", label: "Timeout", type: "number", default: 30, unit: "sec", min: 1, max: 900 },
    {
      key: "architecture",
      label: "Architecture",
      type: "select",
      default: "arm64",
      options: [
        { label: "arm64 (Graviton — cheaper)", value: "arm64" },
        { label: "x86_64", value: "x86_64" },
      ],
    },
  ],
  amplify: [
    { key: "branch", label: "Production branch", type: "text", default: "main", placeholder: "main" },
  ],
  "static-cdn": [
    { key: "outputDir", label: "Build output directory", type: "text", default: "dist", placeholder: "dist" },
    { key: "spa", label: "Single-page app (SPA fallback to index.html)", type: "boolean", default: true },
  ],
  apprunner: [
    {
      key: "cpu",
      label: "vCPU",
      type: "select",
      default: "1",
      options: [
        { label: "0.25 vCPU", value: "0.25" },
        { label: "0.5 vCPU", value: "0.5" },
        { label: "1 vCPU", value: "1" },
        { label: "2 vCPU", value: "2" },
      ],
    },
    { key: "memoryMb", label: "Memory", type: "select", default: "2048", unit: "MB", options: mb([512, 1024, 2048, 3072, 4096]) },
    { key: "port", label: "Container port", type: "number", default: 8080, min: 1, max: 65535 },
  ],
  "ecs-fargate": [
    { key: "cpu", label: "CPU units", type: "select", default: "512", options: opts([256, 512, 1024, 2048, 4096]) },
    { key: "memoryMb", label: "Memory", type: "select", default: "1024", unit: "MB", options: mb([512, 1024, 2048, 4096, 8192]) },
    { key: "desiredCount", label: "Tasks", type: "number", default: 1, min: 1, max: 10 },
    { key: "port", label: "Container port", type: "number", default: 8080, min: 1, max: 65535 },
  ],
  ec2: [
    {
      key: "mode",
      label: "Instance",
      type: "select",
      default: "new",
      help: "One EC2 host can serve multiple apps — reuse an existing instance to save cost.",
      options: [
        { label: "Provision a new instance", value: "new" },
        { label: "Use an existing instance", value: "existing" },
      ],
    },
    {
      key: "instanceId",
      label: "Existing instance ID",
      type: "text",
      placeholder: "i-0abc123def456…",
      showIf: { key: "mode", equals: "existing" },
      help: "The app is deployed onto this instance; Nginx is configured automatically to route it.",
    },
    {
      key: "instanceType",
      label: "Instance type",
      type: "select",
      default: "t3.micro",
      showIf: { key: "mode", equals: "new" },
      options: opts(["t3.micro", "t3.small", "t3.medium", "t3.large", "t4g.small", "t4g.medium"]),
    },
    {
      key: "os",
      label: "Operating system",
      type: "select",
      default: "al2023",
      showIf: { key: "mode", equals: "new" },
      help: "10 most popular official images. The exact AMI is resolved per region at deploy time (SSM public parameters).",
      // Values map to well-known SSM public-parameter aliases so a deploy-time resolver can look up
      // the latest official AMI id per region without hardcoding image ids.
      options: [
        { label: "Amazon Linux 2023", value: "al2023" },
        { label: "Amazon Linux 2", value: "al2" },
        { label: "Ubuntu 24.04 LTS", value: "ubuntu24" },
        { label: "Ubuntu 22.04 LTS", value: "ubuntu22" },
        { label: "Ubuntu 20.04 LTS", value: "ubuntu20" },
        { label: "Debian 12", value: "debian12" },
        { label: "Debian 11", value: "debian11" },
        { label: "Rocky Linux 9", value: "rocky9" },
        { label: "RHEL 9", value: "rhel9" },
        { label: "SUSE Linux Enterprise 15", value: "sles15" },
      ],
    },
    { key: "storageGb", label: "Root storage", type: "number", default: 20, unit: "GB", min: 8, max: 1000, showIf: { key: "mode", equals: "new" } },
    {
      key: "keyPair",
      label: "SSH key pair",
      type: "text",
      placeholder: "existing key pair name (optional)",
      showIf: { key: "mode", equals: "new" },
      help: "An existing EC2 key pair for SSH. Leave blank to use SSM Session Manager (keyless).",
    },
  ],
};

/** Default config object for a target (field key → default value). */
export function defaultTargetConfig(
  kind: DeployTargetKind,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const f of TARGET_CONFIG_SCHEMA[kind]) {
    if (f.default !== undefined) out[f.key] = f.default;
  }
  return out;
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
