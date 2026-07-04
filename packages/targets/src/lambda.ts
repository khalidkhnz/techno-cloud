/**
 * Lambda deploy target (arm64) + Function URL. Default target for APIs/serverless apps.
 * Provisioning runs via Pulumi inside CodeBuild (PLAN.md §5). Stubbed for Phase 1 wiring.
 */

import type {
  DeployContext,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateLambda } from "@techno-deployer/costs";

export class LambdaTarget implements DeployTarget {
  readonly kind = "lambda" as const;
  readonly artifactType = "image" as const;

  async deploy(_ctx: DeployContext): Promise<DeployResult> {
    // TODO(phase1): pulumi up — Lambda (image from ECR) + Function URL + Route53 subdomain.
    throw new Error("LambdaTarget.deploy not implemented");
  }

  async getStatus(_deploymentId: string): Promise<DeploymentStatus> {
    throw new Error("LambdaTarget.getStatus not implemented");
  }

  async *streamLogs(_deploymentId: string): AsyncIterable<LogLine> {
    // TODO(phase1): tail CloudWatch log group (polling).
    throw new Error("LambdaTarget.streamLogs not implemented");
  }

  async rollback(_toDeploymentId: string): Promise<void> {
    throw new Error("LambdaTarget.rollback not implemented");
  }

  async destroy(_deploymentId: string): Promise<void> {
    throw new Error("LambdaTarget.destroy not implemented");
  }

  estimateCost(config: TargetConfig) {
    return estimateLambda(config);
  }
}
