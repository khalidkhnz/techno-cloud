/**
 * Deploy worker — SQS consumer on the `deploy` queue. Triggers the deploy CodeBuild job (which runs
 * Pulumi via `deploy-entrypoint`); it does NOT run Pulumi in-Lambda (no pulumi CLI, 15-min cap).
 */

import type { SQSHandler } from "aws-lambda";
import { db, deployments, eq } from "@techno-deployer/db";
import { claimIdempotency, startBuild } from "@techno-deployer/aws";
import type { DeployJob } from "@techno-deployer/aws";

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    if (!(await claimIdempotency(`deploy:${record.messageId}`))) continue; // duplicate delivery
    const job = JSON.parse(record.body) as DeployJob;

    const buildId = await startBuild(process.env.DEPLOY_PROJECT_NAME ?? "", {
      DEPLOYMENT_ID: job.deploymentId,
      PROJECT_ID: job.projectId,
      IMAGE_URI: job.imageUri ?? "",
    });

    if (!buildId) {
      await db
        .update(deployments)
        .set({ state: "failed" })
        .where(eq(deployments.id, job.deploymentId));
    }
  }
};
