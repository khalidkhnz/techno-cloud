/**
 * Amplify deploy target. Recommended for Next.js SSR / React / static web apps — AWS handles
 * build + host + CDN + TLS. artifactType 'repo' = Amplify's managed CI builds from the repo,
 * so this target bypasses CodeBuild. Stubbed for Phase 1 wiring.
 */

import type {
  DeployContext,
  DeployResult,
  DeploymentStatus,
  DeployTarget,
  LogLine,
  SourceRef,
  TargetConfig,
} from "@techno-deployer/core";
import { estimateAmplify } from "@techno-deployer/costs";
import { amplifyProgram, runStack, stackName } from "@techno-deployer/pulumi";

const APP_PREFIX = () => process.env.APP_PREFIX ?? "td-dev";

function repoUrl(source: SourceRef): string {
  const host =
    source.provider === "gitlab"
      ? "gitlab.com"
      : source.provider === "bitbucket"
        ? "bitbucket.org"
        : "github.com";
  return `https://${host}/${source.repo ?? ""}`;
}

export class AmplifyTarget implements DeployTarget {
  readonly kind = "amplify" as const;
  readonly artifactType = "repo" as const;

  async deploy(ctx: DeployContext): Promise<DeployResult> {
    const name = `${APP_PREFIX()}-app-${ctx.project.id.slice(0, 8)}-${ctx.environment}`;
    const source = ctx.project.source;
    const outputs = await runStack({
      stackName: stackName(ctx.project.id, ctx.environment),
      program: amplifyProgram({
        name,
        repository: repoUrl(source),
        branch: source.ref ?? "main",
        accessToken: process.env.AMPLIFY_ACCESS_TOKEN,
        env: ctx.env,
      }),
    });
    return { url: String(outputs.url ?? ""), targetRef: name, state: "ready" };
  }

  async getStatus(_deploymentId: string): Promise<DeploymentStatus> {
    throw new Error("AmplifyTarget.getStatus not implemented");
  }

  async *streamLogs(_deploymentId: string): AsyncIterable<LogLine> {
    throw new Error("AmplifyTarget.streamLogs not implemented");
  }

  async rollback(_toDeploymentId: string): Promise<void> {
    throw new Error("AmplifyTarget.rollback not implemented");
  }

  async destroy(deploymentId: string): Promise<void> {
    await runStack({ stackName: deploymentId, program: async () => ({}), destroy: true });
  }

  estimateCost(config: TargetConfig) {
    return estimateAmplify(config);
  }
}
