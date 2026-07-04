import type {
  DeployContext,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateFargate } from "@techno-deployer/costs";
import { ecsFargateProgram, runStack, stackName } from "@techno-deployer/pulumi";
import { appName, boundaryArn } from "./util.js";

export class EcsFargateTarget implements DeployTarget {
  readonly kind = "ecs-fargate" as const;
  readonly artifactType = "image" as const;

  async deploy(ctx: DeployContext): Promise<DeployResult> {
    const name = appName(ctx);
    const outputs = await runStack({
      stackName: stackName(ctx.project.id, ctx.environment),
      program: ecsFargateProgram({
        name,
        imageUri: ctx.artifact.ref,
        boundaryArn: boundaryArn(),
        env: ctx.env,
      }),
    });
    return { url: String(outputs.url ?? ""), targetRef: name, state: "ready" };
  }

  async getStatus(_deploymentId: string): Promise<DeploymentStatus> {
    throw new Error("EcsFargateTarget.getStatus not implemented");
  }

  async *streamLogs(_deploymentId: string): AsyncIterable<LogLine> {
    throw new Error("EcsFargateTarget.streamLogs not implemented");
  }

  async rollback(_toDeploymentId: string): Promise<void> {
    throw new Error("EcsFargateTarget.rollback not implemented");
  }

  async destroy(deploymentId: string): Promise<void> {
    await runStack({ stackName: deploymentId, program: async () => ({}), destroy: true });
  }

  estimateCost(config: TargetConfig) {
    return estimateFargate(config);
  }
}
