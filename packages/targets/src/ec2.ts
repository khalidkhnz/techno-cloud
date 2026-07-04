import type {
  DeployContext,
  DeployOptions,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateEc2 } from "@techno-deployer/costs";
import { ec2Program } from "@techno-deployer/pulumi";
import { appName, appTags, boundaryArn, runDeploy, runDestroy } from "./util.js";

export class Ec2Target implements DeployTarget {
  readonly kind = "ec2" as const;
  readonly artifactType = "image" as const;

  async deploy(ctx: DeployContext, opts?: DeployOptions): Promise<DeployResult> {
    const name = appName(ctx);
    return runDeploy(
      ctx,
      name,
      ec2Program({ name, imageUri: ctx.artifact.ref, boundaryArn: boundaryArn(), tags: appTags(ctx) }),
      opts,
    );
  }

  async getStatus(_deploymentId: string): Promise<DeploymentStatus> {
    throw new Error("Ec2Target.getStatus not implemented");
  }

  async *streamLogs(_deploymentId: string): AsyncIterable<LogLine> {
    throw new Error("Ec2Target.streamLogs not implemented");
  }

  async rollback(_toDeploymentId: string): Promise<void> {
    throw new Error("Ec2Target.rollback not implemented");
  }

  async destroy(deploymentId: string): Promise<void> {
    await runDestroy(deploymentId);
  }

  estimateCost(config: TargetConfig) {
    return estimateEc2(config);
  }
}
