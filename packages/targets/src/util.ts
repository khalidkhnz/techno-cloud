import type { DeployContext, DeployOptions, DeployResult } from "@techno-deployer/core";
import { runStack, stackName, type RunOptions } from "@techno-deployer/pulumi";

export const appPrefix = (): string => process.env.APP_PREFIX ?? "td-dev";
export const boundaryArn = (): string => process.env.APP_BOUNDARY_ARN ?? "";

/** Stable per-app resource name (matches the `${prefix}-app-*` pattern the CodeBuild role manages). */
export function appName(ctx: DeployContext): string {
  return `${appPrefix()}-app-${ctx.project.id.slice(0, 8)}-${ctx.environment}`;
}

/** Runs a driver's program via Pulumi; on preview it returns drift instead of applying. */
export async function runDeploy(
  ctx: DeployContext,
  name: string,
  program: RunOptions["program"],
  opts?: DeployOptions,
): Promise<DeployResult> {
  const result = await runStack({
    stackName: stackName(ctx.project.id, ctx.environment),
    program,
    preview: opts?.preview,
  });
  if (opts?.preview) {
    return { url: "", targetRef: name, state: "ready", drift: result.changes > 0 };
  }
  return { url: String(result.outputs.url ?? ""), targetRef: name, state: "ready" };
}

/** Tears down a stack by name. */
export async function runDestroy(stack: string): Promise<void> {
  await runStack({ stackName: stack, program: async () => ({}), destroy: true });
}
