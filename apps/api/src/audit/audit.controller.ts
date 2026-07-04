import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { OwnerGuard } from "../auth/auth.guard.js";
import { AuditService } from "./audit.service.js";

// Platform-wide (cross-team) audit view — restricted to owners, not every team admin.
@UseGuards(OwnerGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query("action") action?: string, @Query("limit") limit?: string) {
    return this.audit.list({ action, limit: limit ? Number(limit) : undefined });
  }
}
