/**
 * Lambda deploy target (arm64) + Function URL. Default target for APIs/serverless apps.
 * Provisioning runs via Pulumi inside CodeBuild (PLAN.md §5). Stubbed for Phase 1 wiring.
 */

import type {
  DeployContext,
  DeployOptions,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateLambda } from "@techno-deployer/costs";
import { lambdaProgram } from "@techno-deployer/pulumi";
import { appName, boundaryArn, runDeploy, runDestroy } from "./util.js";

export class LambdaTarget implements DeployTarget {
  readonly kind = "lambda" as const;
  readonly artifactType = "image" as const;

  async deploy(ctx: DeployContext, opts?: DeployOptions): Promise<DeployResult> {
    const name = appName(ctx);
    return runDeploy(
      ctx,
      name,
      lambdaProgram({ name, imageUri: ctx.artifact.ref, boundaryArn: boundaryArn(), env: ctx.env }),
      opts,
    );
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

  async destroy(deploymentId: string): Promise<void> {
    await runDestroy(deploymentId);
  }

  estimateCost(config: TargetConfig) {
    return estimateLambda(config);
  }
}
