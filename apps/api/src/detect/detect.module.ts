import { Module } from "@nestjs/common";
import { DetectController } from "./detect.controller.js";

@Module({ controllers: [DetectController] })
export class DetectModule {}
