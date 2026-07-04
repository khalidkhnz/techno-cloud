import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { detectFramework, type SourceInspection } from "@techno-deployer/core";
import { AuthGuard } from "../auth/auth.guard.js";

/** Framework detection for the UI create flow (given a lightweight repo inspection). */
@UseGuards(AuthGuard)
@Controller("detect")
export class DetectController {
  @Post()
  detect(@Body() inspection: SourceInspection) {
    return detectFramework(inspection);
  }
}
