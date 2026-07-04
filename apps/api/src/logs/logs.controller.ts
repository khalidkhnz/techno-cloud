import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { LogsService } from "./logs.service.js";

@UseGuards(AuthGuard)
@Controller("projects/:projectId/deployments/:deploymentId/logs")
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  get(
    @Param("deploymentId") deploymentId: string,
    @Query("stream") stream: "build" | "runtime" = "build",
  ) {
    return this.logs.forDeployment(deploymentId, stream);
  }
}
