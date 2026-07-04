import type { DeployContext } from "@techno-deployer/core";

export const appPrefix = (): string => process.env.APP_PREFIX ?? "td-dev";
export const boundaryArn = (): string => process.env.APP_BOUNDARY_ARN ?? "";

/** Stable per-app resource name (matches the `${prefix}-app-*` pattern the CodeBuild role manages). */
export function appName(ctx: DeployContext): string {
  return `${appPrefix()}-app-${ctx.project.id.slice(0, 8)}-${ctx.environment}`;
}
