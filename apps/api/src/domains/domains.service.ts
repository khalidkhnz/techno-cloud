import { randomUUID } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, domains, eq, type Db } from "@techno-deployer/db";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { PlatformConfigService } from "../platform-config/platform-config.service.js";

@Injectable()
export class DomainsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly platformConfig: PlatformConfigService,
  ) {}

  private async assertEnabled(): Promise<void> {
    const config = await this.platformConfig.get();
    if (!config.routing.customDomains) {
      throw new BadRequestException("Custom domains are disabled by the platform config");
    }
  }

  async list(projectId: string) {
    return this.db.select().from(domains).where(eq(domains.projectId, projectId));
  }

  /** Add a domain; returns the TXT record the user must create to verify ownership. */
  async add(projectId: string, hostname: string) {
    await this.assertEnabled();
    const verifyToken = `td-verify=${randomUUID()}`;
    const [row] = await this.db
      .insert(domains)
      .values({ projectId, hostname, verifyToken })
      .returning();
    return {
      domain: row,
      instructions: { type: "TXT", name: `_td-verify.${hostname}`, value: verifyToken },
    };
  }

  /** Verify ownership by resolving the expected TXT record. */
  async verify(projectId: string, domainId: string) {
    const [domain] = await this.db
      .select()
      .from(domains)
      .where(and(eq(domains.id, domainId), eq(domains.projectId, projectId)));
    if (!domain) throw new NotFoundException(`Domain ${domainId} not found`);

    try {
      const records = await resolveTxt(`_td-verify.${domain.hostname}`);
      const found = records.some((chunks) => chunks.join("").includes(domain.verifyToken));
      if (!found) return { verified: false as const };
    } catch {
      return { verified: false as const };
    }

    await this.db.update(domains).set({ verified: true }).where(eq(domains.id, domainId));
    return { verified: true as const };
  }

  async remove(projectId: string, domainId: string) {
    const [domain] = await this.db
      .select()
      .from(domains)
      .where(and(eq(domains.id, domainId), eq(domains.projectId, projectId)));
    if (!domain) throw new NotFoundException(`Domain ${domainId} not found`);
    await this.db.delete(domains).where(eq(domains.id, domainId));
    return { ok: true as const };
  }
}
