import type {
  DeployContext,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateEc2 } from "@techno-deployer/costs";
import { ec2Program, runStack, stackName } from "@techno-deployer/pulumi";
import { appName, boundaryArn } from "./util.js";

export class Ec2Target implements DeployTarget {
  readonly kind = "ec2" as const;
  readonly artifactType = "image" as const;

  async deploy(ctx: DeployContext): Promise<DeployResult> {
    const name = appName(ctx);
    const outputs = await runStack({
      stackName: stackName(ctx.project.id, ctx.environment),
      program: ec2Program({ name, imageUri: ctx.artifact.ref, boundaryArn: boundaryArn() }),
    });
    return { url: String(outputs.url ?? ""), targetRef: name, state: "ready" };
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
    await runStack({ stackName: deploymentId, program: async () => ({}), destroy: true });
  }

  estimateCost(config: TargetConfig) {
    return estimateEc2(config);
  }
}
