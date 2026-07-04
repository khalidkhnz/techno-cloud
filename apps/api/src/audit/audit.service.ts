import { Inject, Injectable } from "@nestjs/common";
import { auditLogs, desc, eq, users, type Db } from "@techno-deployer/db";
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

  async list(limit = 100) {
    return this.db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }
}
