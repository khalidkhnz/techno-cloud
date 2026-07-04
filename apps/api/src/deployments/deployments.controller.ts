import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ProjectMemberGuard, ProjectWriteGuard } from "../auth/auth.guard.js";
import { DeploymentsService } from "./deployments.service.js";

@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/deployments")
export class DeploymentsController {
  constructor(private readonly deployments: DeploymentsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.deployments.list(projectId);
  }

  @UseGuards(ProjectWriteGuard)
  @Post()
  create(@Param("projectId") projectId: string) {
    return this.deployments.create(projectId);
  }

  @UseGuards(ProjectWriteGuard)
  @Post(":deploymentId/rollback")
  rollback(
    @Param("projectId") projectId: string,
    @Param("deploymentId") deploymentId: string,
  ) {
    return this.deployments.rollback(projectId, deploymentId);
  }
}
