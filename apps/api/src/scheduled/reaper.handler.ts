/**
 * Preview reaper — EventBridge Scheduler → Lambda (e.g. hourly). Finds preview environments whose
 * latest deployment is older than `previewTtlHours` and triggers a destroy (deploy CodeBuild job in
 * MODE=destroy), then removes the environment. Keeps preview sprawl / cost in check. See PLAN.md §7.
 */

import { db, deployments, desc, environments, eq, platformConfig, projects } from "@techno-deployer/db";
import { startBuild } from "@techno-deployer/aws";
import { DEFAULT_PLATFORM_CONFIG, type PlatformConfig } from "@techno-deployer/core";

export const handler = async (): Promise<{ reaped: number }> => {
  const [cfgRow] = await db.select().from(platformConfig).where(eq(platformConfig.id, 1));
  const cfg = (cfgRow?.config as PlatformConfig | undefined) ?? DEFAULT_PLATFORM_CONFIG;
  const cutoff = Date.now() - cfg.limits.previewTtlHours * 3_600_000;

  const previews = await db.select().from(environments).where(eq(environments.kind, "preview"));

  let reaped = 0;
  for (const environment of previews) {
    const [latest] = await db
      .select()
      .from(deployments)
      .where(eq(deployments.environmentId, environment.id))
      .orderBy(desc(deployments.createdAt))
      .limit(1);
    if (!latest || new Date(latest.createdAt).getTime() > cutoff) continue;

    // Sanity: only reap environments that still belong to a project.
    const [project] = await db.select().from(projects).where(eq(projects.id, environment.projectId));
    if (!project) continue;

    await startBuild(process.env.DEPLOY_PROJECT_NAME ?? "", {
      DEPLOYMENT_ID: latest.id,
      MODE: "destroy",
    });
    await db
      .update(deployments)
      .set({ state: "destroyed" })
      .where(eq(deployments.environmentId, environment.id));
    await db.delete(environments).where(eq(environments.id, environment.id));
    reaped += 1;
  }

  return { reaped };
};
