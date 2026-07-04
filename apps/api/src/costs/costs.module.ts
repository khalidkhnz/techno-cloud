import { Module } from "@nestjs/common";
import { CostsController } from "./costs.controller.js";
import { CostsService } from "./costs.service.js";

@Module({
  controllers: [CostsController],
  providers: [CostsService],
  exports: [CostsService],
})
export class CostsModule {}
