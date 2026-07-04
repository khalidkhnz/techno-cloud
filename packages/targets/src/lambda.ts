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
import { lambdaProgram, runStack, stackName } from "@techno-deployer/pulumi";

const APP_PREFIX = () => process.env.APP_PREFIX ?? "td-dev";

function appName(ctx: DeployContext): string {
  return `${APP_PREFIX()}-app-${ctx.project.id.slice(0, 8)}-${ctx.environment}`;
}

export class LambdaTarget implements DeployTarget {
  readonly kind = "lambda" as const;
  readonly artifactType = "image" as const;

  async deploy(ctx: DeployContext): Promise<DeployResult> {
    const name = appName(ctx);
    const outputs = await runStack({
      stackName: stackName(ctx.project.id, ctx.environment),
      program: lambdaProgram({
        name,
        imageUri: ctx.artifact.ref,
        boundaryArn: process.env.APP_BOUNDARY_ARN ?? "",
        env: ctx.env,
      }),
    });
    return { url: String(outputs.url ?? ""), targetRef: name, state: "ready" };
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
    // deploymentId is not the stack key here; callers pass `project:env` via a fuller context in
    // the deploy worker. Destroy tears the stack down.
    await runStack({ stackName: deploymentId, program: async () => ({}), destroy: true });
  }

  estimateCost(config: TargetConfig) {
    return estimateLambda(config);
  }
}
