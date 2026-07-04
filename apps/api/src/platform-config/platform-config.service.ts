import { Inject, Injectable } from "@nestjs/common";
import { eq, platformConfig, type Db } from "@techno-deployer/db";
import { DEFAULT_PLATFORM_CONFIG, type PlatformConfig } from "@techno-deployer/core";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

const SINGLETON_ID = 1;

@Injectable()
export class PlatformConfigService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Returns the stored config, or cost-optimized defaults if none set yet. */
  async get(): Promise<PlatformConfig> {
    const [row] = await this.db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.id, SINGLETON_ID));
    return (row?.config as PlatformConfig) ?? DEFAULT_PLATFORM_CONFIG;
  }

  async update(config: PlatformConfig): Promise<PlatformConfig> {
    await this.db
      .insert(platformConfig)
      .values({ id: SINGLETON_ID, config })
      .onConflictDoUpdate({
        target: platformConfig.id,
        set: { config, updatedAt: new Date() },
      });
    return config;
  }
}
