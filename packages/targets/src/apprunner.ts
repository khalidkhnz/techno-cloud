import type {
  DeployContext,
  DeployOptions,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateAppRunner } from "@techno-deployer/costs";
import { appRunnerProgram } from "@techno-deployer/pulumi";
import { appName, appTags, boundaryArn, runDeploy, runDestroy, targetCfg } from "./util.js";

export class AppRunnerTarget implements DeployTarget {
  readonly kind = "apprunner" as const;
  readonly artifactType = "image" as const;

  async deploy(ctx: DeployContext, opts?: DeployOptions): Promise<DeployResult> {
    const name = appName(ctx);
    const c = targetCfg(ctx);
    return runDeploy(
      ctx,
      name,
      appRunnerProgram({
        name,
        imageUri: ctx.artifact.ref,
        boundaryArn: boundaryArn(),
        env: ctx.env,
        tags: appTags(ctx),
        cpu: c.str("cpu"),
        memoryMb: c.int("memoryMb"),
        port: c.int("port"),
      }),
      opts,
    );
  }

  async getStatus(_deploymentId: string): Promise<DeploymentStatus> {
    throw new Error("AppRunnerTarget.getStatus not implemented");
  }

  async *streamLogs(_deploymentId: string): AsyncIterable<LogLine> {
    throw new Error("AppRunnerTarget.streamLogs not implemented");
  }

  async rollback(_toDeploymentId: string): Promise<void> {
    throw new Error("AppRunnerTarget.rollback not implemented");
  }

  async destroy(deploymentId: string): Promise<void> {
    await runDestroy(deploymentId);
  }

  estimateCost(config: TargetConfig) {
    return estimateAppRunner(config);
  }
}
