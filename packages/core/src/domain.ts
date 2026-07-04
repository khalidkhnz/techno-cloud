/** Shared domain types used across the control plane and drivers. */

import type { DeployTargetKind, SourceProviderKind } from "./config.js";

export type EnvironmentKind = "production" | "preview" | "development";

export type DeploymentState =
  | "queued"
  | "building"
  | "deploying"
  | "ready"
  | "failed"
  | "destroyed";

export interface Project {
  id: string;
  teamId: string;
  name: string;
  source: SourceRef;
  target: DeployTargetKind;
  buildConfig?: BuildConfig;
}

/** Optional build overrides — passed to Nixpacks (ignored when a Dockerfile is present). */
export interface BuildConfig {
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
}

export interface SourceRef {
  provider: SourceProviderKind;
  repo?: string; // owner/name for git providers
  ref?: string; // branch / tag / commit
  zipKey?: string; // S3 key for zip uploads
  token?: string; // optional access token for cloning private repos
}

/** Normalized source, staged in S3, ready for the build farm. */
export interface SourceBundle {
  s3Bucket: string;
  s3Key: string;
  commit?: string;
  hasDockerfile: boolean;
}

export interface DeployContext {
  project: Project;
  environment: EnvironmentKind;
  /** Concrete environment identity (e.g. "production", "pr-5") — used for per-env stack naming. */
  environmentName: string;
  deploymentId: string;
  /** Built artifact reference (ECR image URI, S3 static prefix, or repo for Amplify). */
  artifact: { type: "image" | "zip" | "static" | "repo"; ref: string };
  env: Record<string, string>; // resolved env vars (secret values injected at deploy)
  subdomain?: string;
  customDomain?: string;
}

export interface DeployResult {
  url: string;
  targetRef: string; // opaque driver handle (stack name, service arn, amplify app id, ...)
  state: DeploymentState;
  /** Set on a preview (drift-check) run: true if the live stack diverges from desired. */
  drift?: boolean;
}

/** Options for a deploy driver run. */
export interface DeployOptions {
  /** Run `pulumi preview` instead of `up` — reports drift without changing anything. */
  preview?: boolean;
}

export interface DeploymentStatus {
  state: DeploymentState;
  url?: string;
  message?: string;
}

export interface LogLine {
  timestamp: number;
  message: string;
  stream: "build" | "runtime";
}

export type CommitState = "pending" | "success" | "failure";

/** Normalized push event parsed from a provider webhook. */
export interface PushEvent {
  provider: SourceProviderKind;
  repo: string; // owner/name (GitHub/Bitbucket) or group/project (GitLab)
  ref: string; // branch name
  commit: string; // commit sha
}

/** Normalized pull-request event (for preview deployments). */
export interface PullRequestEvent {
  provider: SourceProviderKind;
  repo: string;
  number: number;
  ref: string; // head branch
  commit: string; // head sha
  action: "opened" | "closed";
}
