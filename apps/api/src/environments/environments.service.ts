import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, environments, eq, type Db } from "@techno-deployer/db";
import type { EnvironmentKind } from "@techno-deployer/core";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

export interface CreateEnvironmentDto {
  kind?: EnvironmentKind;
  name: string;
}

@Injectable()
export class EnvironmentsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async list(projectId: string) {
    return this.db.select().from(environments).where(eq(environments.projectId, projectId));
  }

  async create(projectId: string, dto: CreateEnvironmentDto) {
    const [row] = await this.db
      .insert(environments)
      .values({ projectId, kind: dto.kind ?? "development", name: dto.name })
      .returning();
    return row;
  }

  async remove(projectId: string, environmentId: string) {
    const [env] = await this.db
      .select()
      .from(environments)
      .where(and(eq(environments.id, environmentId), eq(environments.projectId, projectId)));
    if (!env) throw new NotFoundException(`Environment ${environmentId} not found`);
    if (env.kind === "production") {
      throw new BadRequestException("The production environment cannot be deleted");
    }
    await this.db.delete(environments).where(eq(environments.id, environmentId));
    return { ok: true as const };
  }
}
