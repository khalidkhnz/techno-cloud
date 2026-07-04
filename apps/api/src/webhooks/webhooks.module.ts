import { Module } from "@nestjs/common";
import { DeploymentsModule } from "../deployments/deployments.module.js";
import { PlatformConfigModule } from "../platform-config/platform-config.module.js";
import { WebhooksController } from "./webhooks.controller.js";
import { WebhooksService } from "./webhooks.service.js";

@Module({
  imports: [DeploymentsModule, PlatformConfigModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
