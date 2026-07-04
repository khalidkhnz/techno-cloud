import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, deployments, environments, eq, projects, type Db } from "@techno-deployer/db";
import { enqueueBuild } from "@techno-deployer/aws";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

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

    await enqueueBuild({ deploymentId: deployment.id, projectId });
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
