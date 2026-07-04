import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ALWAYS_ON_TARGETS,
  SOURCE_PROVIDER_META,
  TARGET_CONFIG_SCHEMA,
  TARGET_META,
  isTargetEnabled,
  type DeployTargetKind,
  type SourceProviderKind,
} from "@techno-deployer/core";
import { AuthGuard } from "../auth/auth.guard.js";
import { PlatformConfigService } from "../platform-config/platform-config.service.js";

/**
 * Master-data endpoint — the single source of truth for dropdown/option values the frontend
 * renders (deploy targets, source providers, roles, environment kinds). Target `enabled` reflects
 * the live PlatformConfig so the create flow never hardcodes the list.
 */
@UseGuards(AuthGuard)
@Controller("meta")
export class MetaController {
  constructor(private readonly platformConfig: PlatformConfigService) {}

  @Get()
  async meta() {
    const config = await this.platformConfig.get();

    const targets = (Object.keys(TARGET_META) as DeployTargetKind[]).map((kind) => ({
      kind,
      label: TARGET_META[kind].label,
      description: TARGET_META[kind].description,
      enabled: isTargetEnabled(config, kind),
      alwaysOn: ALWAYS_ON_TARGETS.includes(kind),
      configSchema: TARGET_CONFIG_SCHEMA[kind],
    }));

    const providers = (Object.keys(SOURCE_PROVIDER_META) as SourceProviderKind[]).map((kind) => ({
      kind,
      ...SOURCE_PROVIDER_META[kind],
    }));

    return {
      targets,
      providers,
      roles: ["owner", "admin", "developer", "viewer"] as const,
      environmentKinds: ["development", "preview", "production"] as const,
    };
  }
}
