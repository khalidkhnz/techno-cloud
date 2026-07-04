import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard, TeamAdminGuard } from "../auth/auth.guard.js";
import { TeamsService } from "./teams.service.js";

type Authed = Request & { authUser?: { email: string } };
type Role = "owner" | "admin" | "developer" | "viewer";

@UseGuards(AuthGuard)
@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@Req() req: Authed) {
    return this.teams.list(req.authUser?.email ?? "");
  }

  @Post()
  create(@Req() req: Authed, @Body() body: { name: string }) {
    return this.teams.create(req.authUser?.email ?? "", body.name);
  }

  @UseGuards(TeamAdminGuard)
  @Get(":teamId/members")
  members(@Param("teamId") teamId: string) {
    return this.teams.members(teamId);
  }

  @UseGuards(TeamAdminGuard)
  @Post(":teamId/members")
  addMember(@Param("teamId") teamId: string, @Body() body: { email: string; role?: Role }) {
    return this.teams.addMember(teamId, body.email, body.role);
  }

  @UseGuards(TeamAdminGuard)
  @Patch(":teamId/members/:userId")
  updateRole(
    @Param("teamId") teamId: string,
    @Param("userId") userId: string,
    @Body() body: { role: Role },
  ) {
    return this.teams.updateRole(teamId, userId, body.role);
  }

  @UseGuards(TeamAdminGuard)
  @Delete(":teamId/members/:userId")
  removeMember(@Param("teamId") teamId: string, @Param("userId") userId: string) {
    return this.teams.removeMember(teamId, userId);
  }
}
