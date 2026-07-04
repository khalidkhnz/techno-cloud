import { Module } from "@nestjs/common";
import { EstimatesController } from "./estimates.controller.js";

@Module({ controllers: [EstimatesController] })
export class EstimatesModule {}
