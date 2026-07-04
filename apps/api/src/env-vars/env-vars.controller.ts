import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from "@nestjs/common";
import { ProjectMemberGuard } from "../auth/auth.guard.js";
import { EnvVarsService, type UpsertEnvVarDto } from "./env-vars.service.js";

type Scope = "production" | "preview" | "development";

@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/env")
export class EnvVarsController {
  constructor(private readonly envVars: EnvVarsService) {}

  @Get()
  list(@Param("projectId") projectId: string, @Query("scope") scope?: Scope) {
    return this.envVars.list(projectId, scope ?? "production");
  }

  @Put()
  upsert(@Param("projectId") projectId: string, @Body() dto: UpsertEnvVarDto) {
    return this.envVars.upsert(projectId, dto);
  }

  @Delete()
  remove(
    @Param("projectId") projectId: string,
    @Query("scope") scope: Scope = "production",
    @Query("key") key: string = "",
  ) {
    return this.envVars.remove(projectId, scope, key);
  }
}
