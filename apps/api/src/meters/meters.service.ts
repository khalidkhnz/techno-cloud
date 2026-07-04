import { Inject, Injectable } from "@nestjs/common";
import { and, eq, freeTierMeters, type Db } from "@techno-deployer/db";
import { FREE_TIER_METERS, meterKey, meterStatus } from "@techno-deployer/costs";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

export interface IngestUsageDto {
  service: string;
  metric: string;
  used: number;
}

@Injectable()
export class MetersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Every free-tier meter with its current usage + status (0 usage until ingested). */
  async list() {
    const rows = await this.db.select().from(freeTierMeters);
    const used = new Map(rows.map((r) => [meterKey(r.service, r.metric), Number(r.usedQty)]));
    return FREE_TIER_METERS.map((m) => {
      const u = used.get(meterKey(m.service, m.metric)) ?? 0;
      return { ...m, used: u, ...meterStatus(u, m.limit) };
    });
  }

  /** Ingest a usage reading (called by the CloudWatch/Neon poller — that source is a TODO). */
  async ingest(dto: IngestUsageDto) {
    const def = FREE_TIER_METERS.find(
      (m) => m.service === dto.service && m.metric === dto.metric,
    );
    const [existing] = await this.db
      .select()
      .from(freeTierMeters)
      .where(and(eq(freeTierMeters.service, dto.service), eq(freeTierMeters.metric, dto.metric)));

    if (existing) {
      await this.db
        .update(freeTierMeters)
        .set({ usedQty: String(dto.used) })
        .where(eq(freeTierMeters.id, existing.id));
    } else {
      await this.db.insert(freeTierMeters).values({
        service: dto.service,
        metric: dto.metric,
        limitQty: String(def?.limit ?? 0),
        usedQty: String(dto.used),
        unit: def?.unit ?? "",
        window: def?.window ?? "monthly",
      });
    }
    return { ok: true as const, ...meterStatus(dto.used, def?.limit ?? 0) };
  }
}
