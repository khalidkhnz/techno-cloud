import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/auth.guard.js";
import { AuditService } from "./audit.service.js";

@UseGuards(AdminGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list() {
    return this.audit.list();
  }
}
