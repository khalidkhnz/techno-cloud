import { Module } from "@nestjs/common";
import { PlatformConfigController } from "./platform-config.controller.js";
import { PlatformConfigService } from "./platform-config.service.js";

@Module({
  controllers: [PlatformConfigController],
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
