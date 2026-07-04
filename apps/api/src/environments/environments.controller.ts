import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ProjectMemberGuard } from "../auth/auth.guard.js";
import { EnvironmentsService, type CreateEnvironmentDto } from "./environments.service.js";

@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/environments")
export class EnvironmentsController {
  constructor(private readonly environments: EnvironmentsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.environments.list(projectId);
  }

  @Post()
  create(@Param("projectId") projectId: string, @Body() dto: CreateEnvironmentDto) {
    return this.environments.create(projectId, dto);
  }

  @Delete(":environmentId")
  remove(
    @Param("projectId") projectId: string,
    @Param("environmentId") environmentId: string,
  ) {
    return this.environments.remove(projectId, environmentId);
  }
}
