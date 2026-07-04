import { Controller, Get, Param, Post } from "@nestjs/common";
import { DeploymentsService } from "./deployments.service.js";

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
}
