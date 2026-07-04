import type {
  DeployContext,
  DeployOptions,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateStaticCdn } from "@techno-deployer/costs";
import { staticCdnProgram } from "@techno-deployer/pulumi";
import { appName, appTags, runDeploy, runDestroy } from "./util.js";

export class StaticCdnTarget implements DeployTarget {
  readonly kind = "static-cdn" as const;
  readonly artifactType = "static" as const;

  async deploy(ctx: DeployContext, opts?: DeployOptions): Promise<DeployResult> {
    const name = appName(ctx);
    return runDeploy(ctx, name, staticCdnProgram({ name, tags: appTags(ctx) }), opts);
  }

  async getStatus(_deploymentId: string): Promise<DeploymentStatus> {
    throw new Error("StaticCdnTarget.getStatus not implemented");
  }

  async *streamLogs(_deploymentId: string): AsyncIterable<LogLine> {
    throw new Error("StaticCdnTarget.streamLogs not implemented");
  }

  async rollback(_toDeploymentId: string): Promise<void> {
    throw new Error("StaticCdnTarget.rollback not implemented");
  }

  async destroy(deploymentId: string): Promise<void> {
    await runDestroy(deploymentId);
  }

  estimateCost(config: TargetConfig) {
    return estimateStaticCdn(config);
  }
}
