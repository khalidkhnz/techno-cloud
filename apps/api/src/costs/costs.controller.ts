import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AdminGuard, AuthGuard } from "../auth/auth.guard.js";
import { CostsService, type CreateBudgetDto } from "./costs.service.js";

type Authed = Request & { authUser?: { email: string } };

@UseGuards(AuthGuard)
@Controller("costs")
export class CostsController {
  constructor(private readonly costs: CostsService) {}

  @Get("snapshots")
  snapshots() {
    return this.costs.snapshots();
  }

  @Get("advice")
  advice(@Req() req: Authed) {
    return this.costs.advice(req.authUser?.email ?? "");
  }

  @Get("budgets")
  listBudgets() {
    return this.costs.listBudgets();
  }

  @UseGuards(AdminGuard)
  @Post("budgets")
  createBudget(@Body() dto: CreateBudgetDto) {
    return this.costs.createBudget(dto);
  }

  @UseGuards(AdminGuard)
  @Delete("budgets/:id")
  deleteBudget(@Param("id") id: string) {
    return this.costs.deleteBudget(id);
  }
}
