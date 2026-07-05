import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DrizzleModule } from "./drizzle/drizzle.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { DeploymentsModule } from "./deployments/deployments.module.js";
import { InvitesModule } from "./invites/invites.module.js";
import { EstimatesModule } from "./estimates/estimates.module.js";
import { EnvVarsModule } from "./env-vars/env-vars.module.js";
import { DetectModule } from "./detect/detect.module.js";
import { WebhooksModule } from "./webhooks/webhooks.module.js";
import { MetersModule } from "./meters/meters.module.js";
import { EnvironmentsModule } from "./environments/environments.module.js";
import { LogsModule } from "./logs/logs.module.js";
import { DomainsModule } from "./domains/domains.module.js";
import { TeamsModule } from "./teams/teams.module.js";
import { CostsModule } from "./costs/costs.module.js";
import { MetaModule } from "./meta/meta.module.js";
import { Ec2Module } from "./ec2/ec2.module.js";
import { PlatformConfigModule } from "./platform-config/platform-config.module.js";

/**
 * Root module. Phase 1 adds: auth, deployments, webhooks, logs modules.
 * Workers (build/deploy) are separate Lambda handlers fed by SQS — see PLAN.md §5.
 */
@Module({
  imports: [
    DrizzleModule,
    AuditModule,
    ProjectsModule,
    DeploymentsModule,
    InvitesModule,
    EstimatesModule,
    EnvVarsModule,
    DetectModule,
    WebhooksModule,
    MetersModule,
    EnvironmentsModule,
    LogsModule,
    DomainsModule,
    TeamsModule,
    CostsModule,
    MetaModule,
    Ec2Module,
    PlatformConfigModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
