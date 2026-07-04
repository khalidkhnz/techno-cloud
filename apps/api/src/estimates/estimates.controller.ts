import { Controller, Get, UseGuards } from "@nestjs/common";
import type { DeployTargetKind } from "@techno-deployer/core";
import {
  estimateAmplify,
  estimateAppRunner,
  estimateEc2,
  estimateFargate,
  estimateLambda,
  estimateStaticCdn,
} from "@techno-deployer/costs";
import { AuthGuard } from "../auth/auth.guard.js";

/** Per-target cost estimates (default sizing) for the project target picker. */
@UseGuards(AuthGuard)
@Controller("estimates")
export class EstimatesController {
  @Get()
  all(): Record<DeployTargetKind, { monthlyLowUsd: number; monthlyHighUsd: number }> {
    const pick = (e: { monthlyLowUsd: number; monthlyHighUsd: number }) => ({
      monthlyLowUsd: e.monthlyLowUsd,
      monthlyHighUsd: e.monthlyHighUsd,
    });
    return {
      lambda: pick(estimateLambda({ kind: "lambda" })),
      amplify: pick(estimateAmplify({ kind: "amplify" })),
      "static-cdn": pick(estimateStaticCdn({ kind: "static-cdn" })),
      apprunner: pick(estimateAppRunner({ kind: "apprunner" })),
      "ecs-fargate": pick(estimateFargate({ kind: "ecs-fargate" })),
      ec2: pick(estimateEc2({ kind: "ec2" })),
    };
  }
}
