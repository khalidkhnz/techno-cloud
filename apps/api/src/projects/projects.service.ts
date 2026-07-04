import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, type Db, projects } from "@techno-deployer/db";
import type { DeployTargetKind } from "@techno-deployer/core";
import type { SourceRef } from "@techno-deployer/core";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

export interface CreateProjectDto {
  teamId: string;
  name: string;
  target?: DeployTargetKind;
  source: SourceRef;
}

@Injectable()
export class ProjectsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async list(teamId?: string) {
    if (teamId) {
      return this.db.select().from(projects).where(eq(projects.teamId, teamId));
    }
    return this.db.select().from(projects);
  }

  async create(dto: CreateProjectDto) {
    const [row] = await this.db
      .insert(projects)
      .values({
        teamId: dto.teamId,
        name: dto.name,
        target: dto.target ?? "lambda",
        source: dto.source,
      })
      .returning();
    return row;
  }

  async get(id: string) {
    const [row] = await this.db.select().from(projects).where(eq(projects.id, id));
    if (!row) throw new NotFoundException(`Project ${id} not found`);
    return row;
  }
}
