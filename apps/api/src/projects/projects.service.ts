import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { count, eq, type Db, projects } from "@techno-deployer/db";
import { isTargetEnabled } from "@techno-deployer/core";
import type { BuildConfig, DeployTargetKind } from "@techno-deployer/core";
import type { SourceRef } from "@techno-deployer/core";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { PlatformConfigService } from "../platform-config/platform-config.service.js";

export interface CreateProjectDto {
  teamId: string;
  name: string;
  target?: DeployTargetKind;
  source: SourceRef;
  buildConfig?: BuildConfig;
  notifyEmail?: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly platformConfig: PlatformConfigService,
  ) {}

  async list(teamId?: string) {
    if (teamId) {
      return this.db.select().from(projects).where(eq(projects.teamId, teamId));
    }
    return this.db.select().from(projects);
  }

  async create(dto: CreateProjectDto) {
    const target = dto.target ?? "lambda";
    const config = await this.platformConfig.get();
    if (!isTargetEnabled(config, target)) {
      throw new BadRequestException(`Target "${target}" is disabled by the platform config`);
    }

    // Quota: cap projects per team (Phase 4 §3).
    const rows = await this.db
      .select({ n: count() })
      .from(projects)
      .where(eq(projects.teamId, dto.teamId));
    const projectCount = Number(rows[0]?.n ?? 0);
    if (projectCount >= config.limits.maxAppsPerTeam) {
      throw new BadRequestException(
        `Team has reached the maximum of ${config.limits.maxAppsPerTeam} projects`,
      );
    }

    const [row] = await this.db
      .insert(projects)
      .values({
        teamId: dto.teamId,
        name: dto.name,
        target,
        source: dto.source,
        buildConfig: dto.buildConfig ?? null,
        notifyEmail: dto.notifyEmail ?? null,
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
