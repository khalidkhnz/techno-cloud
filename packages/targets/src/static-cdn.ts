import type {
  DeployContext,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateStaticCdn } from "@techno-deployer/costs";
import { runStack, staticCdnProgram, stackName } from "@techno-deployer/pulumi";
import { appName } from "./util.js";

export class StaticCdnTarget implements DeployTarget {
  readonly kind = "static-cdn" as const;
  readonly artifactType = "static" as const;

  async deploy(ctx: DeployContext): Promise<DeployResult> {
    const name = appName(ctx);
    const outputs = await runStack({
      stackName: stackName(ctx.project.id, ctx.environment),
      program: staticCdnProgram({ name }),
    });
    return { url: String(outputs.url ?? ""), targetRef: name, state: "ready" };
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
    await runStack({ stackName: deploymentId, program: async () => ({}), destroy: true });
  }

  estimateCost(config: TargetConfig) {
    return estimateStaticCdn(config);
  }
}
