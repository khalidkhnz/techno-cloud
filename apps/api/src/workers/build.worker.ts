/**
 * Build worker — SQS consumer on the `build` queue. Marks the deployment `building`, then
 * starts a CodeBuild run (clone → Dockerfile-detect/Nixpacks → push ECR). On build completion
 * an EventBridge rule enqueues the deploy job. TODO(phase1): wire the CodeBuild-completion rule.
 */

import type { SQSHandler } from "aws-lambda";
import { db, deployments, eq, projects } from "@techno-deployer/db";
import { startBuild } from "@techno-deployer/aws";
import type { BuildJob } from "@techno-deployer/aws";

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const job = JSON.parse(record.body) as BuildJob;

    await db.update(deployments).set({ state: "building" }).where(eq(deployments.id, job.deploymentId));

    const [project] = await db.select().from(projects).where(eq(projects.id, job.projectId));
    if (!project) {
      await db
        .update(deployments)
        .set({ state: "failed" })
        .where(eq(deployments.id, job.deploymentId));
      continue;
    }

    const buildId = await startBuild(process.env.BUILD_PROJECT_NAME ?? "", {
      DEPLOYMENT_ID: job.deploymentId,
      PROJECT_ID: job.projectId,
      TARGET: project.target,
      SOURCE: JSON.stringify(project.source),
    });

    await db
      .update(deployments)
      .set({ buildId: buildId ?? null })
      .where(eq(deployments.id, job.deploymentId));
  }
};
