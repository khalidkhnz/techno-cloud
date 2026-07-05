import type {
  DeployContext,
  DeployOptions,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateFargate } from "@techno-deployer/costs";
import { ecsFargateProgram } from "@techno-deployer/pulumi";
import { appName, appTags, boundaryArn, runDeploy, runDestroy, targetCfg } from "./util.js";

export class EcsFargateTarget implements DeployTarget {
  readonly kind = "ecs-fargate" as const;
  readonly artifactType = "image" as const;

  async deploy(ctx: DeployContext, opts?: DeployOptions): Promise<DeployResult> {
    const name = appName(ctx);
    const c = targetCfg(ctx);
    const memoryMb = c.int("memoryMb");
    return runDeploy(
      ctx,
      name,
      ecsFargateProgram({
        name,
        imageUri: ctx.artifact.ref,
        boundaryArn: boundaryArn(),
        env: ctx.env,
        tags: appTags(ctx),
        cpu: c.str("cpu"),
        memory: memoryMb !== undefined ? String(memoryMb) : undefined,
        desiredCount: c.int("desiredCount"),
        port: c.int("port"),
      }),
      opts,
    );
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
    await runDestroy(deploymentId);
  }

  estimateCost(config: TargetConfig) {
    return estimateFargate(config);
  }
}
