import { Body, Controller, Get, Put } from "@nestjs/common";
import type { PlatformConfig } from "@techno-deployer/core";
import { PlatformConfigService } from "./platform-config.service.js";

@Controller("platform-config")
export class PlatformConfigController {
  constructor(private readonly config: PlatformConfigService) {}

  @Get()
  get(): Promise<PlatformConfig> {
    return this.config.get();
  }

  @Put()
  update(@Body() config: PlatformConfig): Promise<PlatformConfig> {
    return this.config.update(config);
  }
}
