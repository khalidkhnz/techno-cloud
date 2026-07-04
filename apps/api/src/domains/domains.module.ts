import { Module } from "@nestjs/common";
import { PlatformConfigModule } from "../platform-config/platform-config.module.js";
import { DomainsController } from "./domains.controller.js";
import { DomainsService } from "./domains.service.js";

@Module({
  imports: [PlatformConfigModule],
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
