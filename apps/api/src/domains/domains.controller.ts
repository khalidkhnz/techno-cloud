import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ProjectMemberGuard, ProjectWriteGuard } from "../auth/auth.guard.js";
import { DomainsService } from "./domains.service.js";

@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/domains")
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.domains.list(projectId);
  }

  @UseGuards(ProjectWriteGuard)
  @Post()
  add(@Param("projectId") projectId: string, @Body() body: { hostname: string }) {
    return this.domains.add(projectId, body.hostname);
  }

  @UseGuards(ProjectWriteGuard)
  @Post(":domainId/verify")
  verify(@Param("projectId") projectId: string, @Param("domainId") domainId: string) {
    return this.domains.verify(projectId, domainId);
  }

  @UseGuards(ProjectWriteGuard)
  @Delete(":domainId")
  remove(@Param("projectId") projectId: string, @Param("domainId") domainId: string) {
    return this.domains.remove(projectId, domainId);
  }
}
