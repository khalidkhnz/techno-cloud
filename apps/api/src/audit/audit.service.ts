import { Inject, Injectable } from "@nestjs/common";
import { auditLogs, desc, eq, sql, users, type Db } from "@techno-deployer/db";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

export interface AuditEntry {
  action: string;
  target?: string;
  actorEmail?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Best-effort audit write — never throws into the request path. */
  async write(entry: AuditEntry): Promise<void> {
    try {
      let actorId: string | null = null;
      if (entry.actorEmail) {
        const [u] = await this.db.select().from(users).where(eq(users.email, entry.actorEmail));
        actorId = u?.id ?? null;
      }
      await this.db.insert(auditLogs).values({
        actorId,
        action: entry.action,
        target: entry.target ?? null,
        meta: { ...(entry.meta ?? {}), actorEmail: entry.actorEmail ?? null },
      });
    } catch {
      // swallow — auditing must not break the operation being audited
    }
  }

  /**
   * Platform-wide (cross-team) list — intentionally NOT team-scoped, so it must stay behind the
   * OwnerGuard (owner role only). audit_logs has no per-entry team; if per-team audit views are
   * needed later, add a teamId column and filter here.
   */
  async list(opts?: { limit?: number; action?: string }) {
    const limit = Math.min(opts?.limit ?? 100, 500);
    const base = this.db.select().from(auditLogs);
    const rows = opts?.action
      ? base.where(sql`${auditLogs.action} ILIKE ${`%${opts.action}%`}`)
      : base;
    return rows.orderBy(desc(auditLogs.createdAt)).limit(limit);
  }
}
