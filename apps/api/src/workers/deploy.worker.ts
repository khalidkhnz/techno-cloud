/**
 * Deploy worker — SQS consumer on the `deploy` queue. Marks the deployment `deploying`, then
 * runs the target driver's `deploy()` (Pulumi up, in CodeBuild) under a DynamoDB stack lock so
 * only one run mutates a `project:env` stack at a time. Marks `ready`/`failed` from the result.
 */

import type { SQSHandler } from "aws-lambda";
import { db, deployments, eq, projects } from "@techno-deployer/db";
import { withLock } from "@techno-deployer/aws";
import type { DeployJob } from "@techno-deployer/aws";
import type { DeployTargetKind, SourceRef } from "@techno-deployer/core";
import { createTargetRegistry } from "@techno-deployer/targets";

const registry = createTargetRegistry();

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const job = JSON.parse(record.body) as DeployJob;

    const [deployment] = await db
      .select()
      .from(deployments)
      .where(eq(deployments.id, job.deploymentId));
    const [project] = await db.select().from(projects).where(eq(projects.id, job.projectId));
    if (!deployment || !project) continue;

    await db.update(deployments).set({ state: "deploying" }).where(eq(deployments.id, deployment.id));

    const target = registry.get(project.target as DeployTargetKind);
    const lockId = `${project.id}:${deployment.environmentId}`;

    try {
      const result = await withLock(lockId, () =>
        target.deploy({
          project: {
            id: project.id,
            teamId: project.teamId,
            name: project.name,
            source: project.source as SourceRef,
            target: project.target as DeployTargetKind,
          },
          environment: "production",
          deploymentId: deployment.id,
          artifact: {
            type: target.artifactType,
            ref: job.imageUri ?? "",
          },
          env: {},
        }),
      );

      await db
        .update(deployments)
        .set({ state: "ready", url: result.url, targetRef: result.targetRef })
        .where(eq(deployments.id, deployment.id));
    } catch (err) {
      await db.update(deployments).set({ state: "failed" }).where(eq(deployments.id, deployment.id));
      throw err; // surface to SQS for retry / DLQ
    }
  }
};
