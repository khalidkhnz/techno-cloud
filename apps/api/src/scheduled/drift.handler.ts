/**
 * Drift detector — EventBridge Scheduler → Lambda (e.g. daily). For each project's latest READY
 * deployment, triggers the deploy CodeBuild job in MODE=preview (runs `pulumi preview`); drift is
 * reported in the job's CloudWatch logs. See PHASE4 §5.
 */

import { and, db, deployments, desc, eq, projects } from "@techno-deployer/db";
import { startBuild } from "@techno-deployer/aws";

export const handler = async (): Promise<{ checked: number }> => {
  const allProjects = await db.select().from(projects);

  let checked = 0;
  for (const project of allProjects) {
    const [latest] = await db
      .select()
      .from(deployments)
      .where(and(eq(deployments.projectId, project.id), eq(deployments.state, "ready")))
      .orderBy(desc(deployments.createdAt))
      .limit(1);
    if (!latest) continue;

    await startBuild(process.env.DEPLOY_PROJECT_NAME ?? "", {
      DEPLOYMENT_ID: latest.id,
      MODE: "preview",
    });
    checked += 1;
  }
  return { checked };
};
