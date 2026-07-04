import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { ProjectsService, type CreateProjectDto } from "./projects.service.js";

@UseGuards(AuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@Query("teamId") teamId?: string) {
    return this.projects.list(teamId);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.projects.get(id);
  }
}
