import { Inject, Injectable } from "@nestjs/common";
import { budgets, costSnapshots, desc, eq, type Db } from "@techno-deployer/db";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

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
