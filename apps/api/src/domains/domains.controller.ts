import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { DomainsService } from "./domains.service.js";

@UseGuards(AuthGuard)
@Controller("projects/:projectId/domains")
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.domains.list(projectId);
  }

  @Post()
  add(@Param("projectId") projectId: string, @Body() body: { hostname: string }) {
    return this.domains.add(projectId, body.hostname);
  }

  @Post(":domainId/verify")
  verify(@Param("projectId") projectId: string, @Param("domainId") domainId: string) {
    return this.domains.verify(projectId, domainId);
  }

  @Delete(":domainId")
  remove(@Param("projectId") projectId: string, @Param("domainId") domainId: string) {
    return this.domains.remove(projectId, domainId);
  }
}
