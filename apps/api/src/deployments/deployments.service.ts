import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, deployments, environments, eq, projects, type Db } from "@techno-deployer/db";
import { enqueueBuild, enqueueDeploy } from "@techno-deployer/aws";
import { env } from "@techno-deployer/env";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

/** Deterministic ECR image URI for a deployment (tag = deploymentId). */
function imageUriFor(deploymentId: string): string | null {
  return env.ECR_REGISTRY ? `${env.ECR_REGISTRY}:${deploymentId}` : null;
}

@Injectable()
export class DeploymentsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async list(projectId: string) {
    return this.db
      .select()
      .from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(deployments.createdAt);
  }

  /** Creates a queued deployment for a project and enqueues a build job. */
  async create(projectId: string) {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const environmentId = await this.findOrCreateProductionEnv(projectId);

    const [deployment] = await this.db
      .insert(deployments)
      .values({ projectId, environmentId, state: "queued" })
      .returning();
    if (!deployment) throw new Error("Failed to create deployment");

    // Record the deterministic artifact URI so a later rollback can reuse it without rebuilding.
    await this.db
      .update(deployments)
      .set({ imageUri: imageUriFor(deployment.id) })
      .where(eq(deployments.id, deployment.id));

    await enqueueBuild({ deploymentId: deployment.id, projectId });
    return deployment;
  }

  /**
   * Rollback: create a new deployment reusing a prior READY deployment's artifact and enqueue a
   * deploy directly (no rebuild). Guarded against rolling back to failed/destroyed deployments.
   */
  async rollback(projectId: string, toDeploymentId: string) {
    const [target] = await this.db
      .select()
      .from(deployments)
      .where(and(eq(deployments.id, toDeploymentId), eq(deployments.projectId, projectId)));
    if (!target) throw new NotFoundException(`Deployment ${toDeploymentId} not found`);
    if (target.state !== "ready") {
      throw new BadRequestException("Can only roll back to a ready deployment");
    }
    if (!target.imageUri) {
      throw new BadRequestException("Target deployment has no stored artifact to roll back to");
    }

    const [deployment] = await this.db
      .insert(deployments)
      .values({
        projectId,
        environmentId: target.environmentId,
        state: "queued",
        imageUri: target.imageUri,
        rolledBackFrom: target.id,
      })
      .returning();
    if (!deployment) throw new Error("Failed to create rollback deployment");

    await enqueueDeploy({ deploymentId: deployment.id, projectId, imageUri: target.imageUri });
    return deployment;
  }

  private async findOrCreateProductionEnv(projectId: string): Promise<string> {
    const [existing] = await this.db
      .select()
      .from(environments)
      .where(and(eq(environments.projectId, projectId), eq(environments.kind, "production")));
    if (existing) return existing.id;

    const [created] = await this.db
      .insert(environments)
      .values({ projectId, kind: "production", name: "production" })
      .returning();
    if (!created) throw new Error("Failed to create production environment");
    return created.id;
  }
}
