import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { AdminGuard, AuthGuard } from "../auth/auth.guard.js";
import { MetersService, type IngestUsageDto } from "./meters.service.js";

@UseGuards(AuthGuard)
@Controller("meters")
export class MetersController {
  constructor(private readonly meters: MetersService) {}

  @Get()
  list() {
    return this.meters.list();
  }

  @Get("alerts")
  alerts() {
    return this.meters.alerts();
  }

  @UseGuards(AdminGuard)
  @Put("usage")
  ingest(@Body() dto: IngestUsageDto) {
    return this.meters.ingest(dto);
  }
}
