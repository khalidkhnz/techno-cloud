/**
 * Deploy entrypoint — runs INSIDE the deploy CodeBuild job (where the pulumi CLI is available).
 * Triggered by the deploy worker with DEPLOYMENT_ID/IMAGE_URI env. Resolves env vars (secrets from
 * Parameter Store), runs the target driver's Pulumi program under a DynamoDB stack lock, and writes
 * the resulting state back to the deployment. See PLAN.md §5.
 */

import { and, db, deployments, environments, envVars, eq, projects } from "@techno-deployer/db";
import { getSecret, withLock } from "@techno-deployer/aws";
import type { DeployContext, DeployTargetKind, EnvironmentKind, SourceRef } from "@techno-deployer/core";
import { createTargetRegistry } from "@techno-deployer/targets";

async function resolveEnv(projectId: string, scope: EnvironmentKind): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(envVars)
    .where(and(eq(envVars.projectId, projectId), eq(envVars.scope, scope)));
  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.key] = row.isSecret ? ((await getSecret(row.value)) ?? "") : row.value;
  }
  return out;
}

async function main(): Promise<void> {
  const deploymentId = process.env.DEPLOYMENT_ID;
  if (!deploymentId) throw new Error("DEPLOYMENT_ID is not set");

  const [deployment] = await db.select().from(deployments).where(eq(deployments.id, deploymentId));
  if (!deployment) throw new Error(`Deployment ${deploymentId} not found`);
  const [project] = await db.select().from(projects).where(eq(projects.id, deployment.projectId));
  if (!project) throw new Error(`Project ${deployment.projectId} not found`);
  const [environment] = await db
    .select()
    .from(environments)
    .where(eq(environments.id, deployment.environmentId));
  const scope = (environment?.kind ?? "production") as EnvironmentKind;

  const target = createTargetRegistry().get(project.target as DeployTargetKind);
  const lockId = `${project.id}:${deployment.environmentId}`;
  const stack = `${project.id}-${scope}`;

  // Destroy mode (used by the preview reaper): tear the stack down and mark destroyed.
  if (process.env.MODE === "destroy") {
    await withLock(lockId, () => target.destroy(stack));
    await db.update(deployments).set({ state: "destroyed" }).where(eq(deployments.id, deploymentId));
    return;
  }

  const env = await resolveEnv(project.id, scope);
  const ctx: DeployContext = {
    project: {
      id: project.id,
      teamId: project.teamId,
      name: project.name,
      source: project.source as SourceRef,
      target: project.target as DeployTargetKind,
    },
    environment: scope,
    deploymentId,
    artifact: { type: target.artifactType, ref: process.env.IMAGE_URI ?? deployment.imageUri ?? "" },
    env,
  };

  // Preview mode (drift check): report divergence from desired state without applying.
  if (process.env.MODE === "preview") {
    const result = await withLock(lockId, () => target.deploy(ctx, { preview: true }));
    // eslint-disable-next-line no-console
    console.log(`[drift] ${stack}: ${result.drift ? "DETECTED" : "none"}`);
    return;
  }

  await db.update(deployments).set({ state: "deploying" }).where(eq(deployments.id, deploymentId));

  try {
    const result = await withLock(lockId, () => target.deploy(ctx));
    await db
      .update(deployments)
      .set({ state: "ready", url: result.url, targetRef: result.targetRef })
      .where(eq(deployments.id, deploymentId));
  } catch (err) {
    await db.update(deployments).set({ state: "failed" }).where(eq(deployments.id, deploymentId));
    throw err;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
