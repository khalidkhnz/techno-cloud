import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AdminGuard, AuthGuard } from "../auth/auth.guard.js";
import { CostsService, type CreateBudgetDto } from "./costs.service.js";

@UseGuards(AuthGuard)
@Controller("costs")
export class CostsController {
  constructor(private readonly costs: CostsService) {}

  @Get("snapshots")
  snapshots() {
    return this.costs.snapshots();
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
