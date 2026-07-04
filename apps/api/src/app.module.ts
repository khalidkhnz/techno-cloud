import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DrizzleModule } from "./drizzle/drizzle.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { DeploymentsModule } from "./deployments/deployments.module.js";
import { InvitesModule } from "./invites/invites.module.js";
import { EstimatesModule } from "./estimates/estimates.module.js";
import { EnvVarsModule } from "./env-vars/env-vars.module.js";
import { DetectModule } from "./detect/detect.module.js";
import { WebhooksModule } from "./webhooks/webhooks.module.js";
import { MetersModule } from "./meters/meters.module.js";
import { PlatformConfigModule } from "./platform-config/platform-config.module.js";

/**
 * Root module. Phase 1 adds: auth, deployments, webhooks, logs modules.
 * Workers (build/deploy) are separate Lambda handlers fed by SQS — see PLAN.md §5.
 */
@Module({
  imports: [
    DrizzleModule,
    ProjectsModule,
    DeploymentsModule,
    InvitesModule,
    EstimatesModule,
    EnvVarsModule,
    DetectModule,
    WebhooksModule,
    MetersModule,
    PlatformConfigModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
