import { Module } from "@nestjs/common";
import { PlatformConfigModule } from "../platform-config/platform-config.module.js";
import { MetaController } from "./meta.controller.js";

@Module({
  imports: [PlatformConfigModule],
  controllers: [MetaController],
})
export class MetaModule {}
