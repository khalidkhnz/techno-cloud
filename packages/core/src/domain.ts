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
}

export interface SourceRef {
  provider: SourceProviderKind;
  repo?: string; // owner/name for git providers
  ref?: string; // branch / tag / commit
  zipKey?: string; // S3 key for zip uploads
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
