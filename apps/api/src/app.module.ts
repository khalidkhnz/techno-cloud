import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";

/**
 * Root module. Phase 1 adds: auth, projects, deployments, webhooks, logs modules.
 * Workers (build/deploy) are separate Lambda handlers fed by SQS — see PLAN.md §5.
 */
@Module({
  controllers: [HealthController],
})
export class AppModule {}
