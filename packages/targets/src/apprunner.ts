import type {
  DeployContext,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateAppRunner } from "@techno-deployer/costs";
import { appRunnerProgram, runStack, stackName } from "@techno-deployer/pulumi";
import { appName, boundaryArn } from "./util.js";

export class AppRunnerTarget implements DeployTarget {
  readonly kind = "apprunner" as const;
  readonly artifactType = "image" as const;

  async deploy(ctx: DeployContext): Promise<DeployResult> {
    const name = appName(ctx);
    const outputs = await runStack({
      stackName: stackName(ctx.project.id, ctx.environment),
      program: appRunnerProgram({
        name,
        imageUri: ctx.artifact.ref,
        boundaryArn: boundaryArn(),
        env: ctx.env,
      }),
    });
    return { url: String(outputs.url ?? ""), targetRef: name, state: "ready" };
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
    await runStack({ stackName: deploymentId, program: async () => ({}), destroy: true });
  }

  estimateCost(config: TargetConfig) {
    return estimateAppRunner(config);
  }
}
