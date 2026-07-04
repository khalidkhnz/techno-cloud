import { Module } from "@nestjs/common";
import { EnvVarsController } from "./env-vars.controller.js";
import { EnvVarsService } from "./env-vars.service.js";

@Module({
  controllers: [EnvVarsController],
  providers: [EnvVarsService],
  exports: [EnvVarsService],
})
export class EnvVarsModule {}
