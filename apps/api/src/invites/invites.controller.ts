import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/auth.guard.js";
import { InvitesService, type CreateInviteDto } from "./invites.service.js";

@Controller("invites")
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @UseGuards(AdminGuard)
  @Get()
  list() {
    return this.invites.list();
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() dto: CreateInviteDto) {
    return this.invites.create(dto);
  }

  // Public: called from the accept-invite page before the user has a session.
  @Post("accept")
  accept(@Query("token") token: string) {
    return this.invites.accept(token);
  }
}
