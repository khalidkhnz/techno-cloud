import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard, ProjectMemberGuard } from "../auth/auth.guard.js";
import { ProjectsService, type CreateProjectDto } from "./projects.service.js";

type Authed = Request & { authUser?: { email: string } };

@UseGuards(AuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@Req() req: Authed) {
    return this.projects.list(req.authUser?.email ?? "");
  }

  @Post()
  create(@Req() req: Authed, @Body() dto: CreateProjectDto) {
    return this.projects.create(req.authUser?.email ?? "", dto);
  }

  @UseGuards(ProjectMemberGuard)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.projects.get(id);
  }
}
