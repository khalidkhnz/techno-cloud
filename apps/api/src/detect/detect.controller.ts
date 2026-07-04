import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { buildPlan, detectFramework, type SourceInspection } from "@techno-deployer/core";
import { AuthGuard } from "../auth/auth.guard.js";
import { inspectRepo } from "./repo-inspector.js";

interface DetectRepoDto {
  provider: string;
  repo: string;
  ref?: string;
  token?: string;
}

/** Framework detection for the UI create flow. */
@UseGuards(AuthGuard)
@Controller("detect")
export class DetectController {
  /** Detect from a client-supplied inspection (files + package.json). */
  @Post()
  detect(@Body() inspection: SourceInspection) {
    const detection = detectFramework(inspection);
    return { detection, plan: buildPlan(detection) };
  }

  /** Fetch the repo's top-level files + package.json, then detect framework + build plan. */
  @Post("repo")
  async detectRepo(@Body() body: DetectRepoDto) {
    const { inspection, inspected, note } = await inspectRepo(body);
    const detection = detectFramework(inspection);
    return { detection, plan: buildPlan(detection), inspected, note, files: inspection.files };
  }
}
