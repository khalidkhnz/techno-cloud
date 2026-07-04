import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { InvitesService, type CreateInviteDto } from "./invites.service.js";

// TODO(phase3): guard create/list behind Admin session (RBAC).
@Controller("invites")
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get()
  list() {
    return this.invites.list();
  }

  @Post()
  create(@Body() dto: CreateInviteDto) {
    return this.invites.create(dto);
  }

  @Post("accept")
  accept(@Query("token") token: string) {
    return this.invites.accept(token);
  }
}
