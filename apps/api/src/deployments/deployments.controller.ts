import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { DeploymentsService } from "./deployments.service.js";

@UseGuards(AuthGuard)
@Controller("projects/:projectId/deployments")
export class DeploymentsController {
  constructor(private readonly deployments: DeploymentsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.deployments.list(projectId);
  }

  @Post()
  create(@Param("projectId") projectId: string) {
    return this.deployments.create(projectId);
  }

  @Post(":deploymentId/rollback")
  rollback(
    @Param("projectId") projectId: string,
    @Param("deploymentId") deploymentId: string,
  ) {
    return this.deployments.rollback(projectId, deploymentId);
  }
}
