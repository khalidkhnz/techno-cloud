import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import type { PlatformConfig } from "@techno-deployer/core";
import { AdminGuard, AuthGuard } from "../auth/auth.guard.js";
import { PlatformConfigService } from "./platform-config.service.js";

@UseGuards(AuthGuard)
@Controller("platform-config")
export class PlatformConfigController {
  constructor(private readonly config: PlatformConfigService) {}

  @Get()
  get(): Promise<PlatformConfig> {
    return this.config.get();
  }

  @UseGuards(AdminGuard)
  @Put()
  update(@Body() config: PlatformConfig): Promise<PlatformConfig> {
    return this.config.update(config);
  }
}
