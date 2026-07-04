/**
 * Amplify deploy target. Recommended for Next.js SSR / React / static web apps — AWS handles
 * build + host + CDN + TLS. artifactType 'repo' = Amplify's managed CI builds from the repo,
 * so this target bypasses CodeBuild. Stubbed for Phase 1 wiring.
 */

import type {
  DeployContext,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { AS_OF } from "@techno-deployer/costs";

export class AmplifyTarget implements DeployTarget {
  readonly kind = "amplify" as const;
  readonly artifactType = "repo" as const;

  async deploy(_ctx: DeployContext): Promise<DeployResult> {
    // TODO(phase1): pulumi up — Amplify app + branch connected to repo + subdomain.
    throw new Error("AmplifyTarget.deploy not implemented");
  }

  async getStatus(_deploymentId: string): Promise<DeploymentStatus> {
    throw new Error("AmplifyTarget.getStatus not implemented");
  }

  async *streamLogs(_deploymentId: string): AsyncIterable<LogLine> {
    throw new Error("AmplifyTarget.streamLogs not implemented");
  }

  async rollback(_toDeploymentId: string): Promise<void> {
    throw new Error("AmplifyTarget.rollback not implemented");
  }

  async destroy(_deploymentId: string): Promise<void> {
    throw new Error("AmplifyTarget.destroy not implemented");
  }

  estimateCost(_config: TargetConfig) {
    // Amplify is 12-month free then usage-based; low-traffic internal apps ≈ $0–5/mo.
    return {
      monthlyLowUsd: 0,
      monthlyHighUsd: 5,
      breakdown: [],
      freeTierApplied: true,
      ratesAsOf: AS_OF,
    };
  }
}
