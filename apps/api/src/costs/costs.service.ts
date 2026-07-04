import { Inject, Injectable } from "@nestjs/common";
import { budgets, costSnapshots, desc, eq, projects, type Db } from "@techno-deployer/db";
import type { DeployTargetKind } from "@techno-deployer/core";
import { AS_OF, isRateCardStale, suggestRightsizing } from "@techno-deployer/costs";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { teamIdsForEmail } from "../auth/auth.guard.js";

export interface CreateBudgetDto {
  scope: "project" | "global";
  refId?: string;
  thresholdUsd: number;
}

@Injectable()
export class CostsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Recent reconciled cost snapshots (est vs actual per project/global). */
  snapshots() {
    return this.db.select().from(costSnapshots).orderBy(desc(costSnapshots.createdAt)).limit(100);
  }

  listBudgets() {
    return this.db.select().from(budgets);
  }

  /** Rightsizing advice for the caller's always-on projects + rate-card freshness. */
  async advice(email: string) {
    const teams = await teamIdsForEmail(this.db, email);
    const rows = teams.length
      ? await this.db.select().from(projects)
      : [];
    const suggestions = rows
      .filter((p) => teams.includes(p.teamId))
      .map((p) => ({ project: p.id, name: p.name, ...suggestRightsizing(p.target as DeployTargetKind) }))
      .filter((s) => s.recommendation);
    return {
      suggestions,
      rateCard: { asOf: AS_OF, stale: isRateCardStale(AS_OF, Date.now()) },
    };
  }

  async createBudget(dto: CreateBudgetDto) {
    const [row] = await this.db
      .insert(budgets)
      .values({ scope: dto.scope, refId: dto.refId ?? null, thresholdUsd: String(dto.thresholdUsd) })
      .returning();
    return row;
  }

  async deleteBudget(id: string) {
    await this.db.delete(budgets).where(eq(budgets.id, id));
    return { ok: true as const };
  }
}
