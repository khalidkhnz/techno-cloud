import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ProjectsService, type CreateProjectDto } from "./projects.service.js";

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
