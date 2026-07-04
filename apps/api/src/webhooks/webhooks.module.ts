import { Module } from "@nestjs/common";
import { DeploymentsModule } from "../deployments/deployments.module.js";
import { WebhooksController } from "./webhooks.controller.js";
import { WebhooksService } from "./webhooks.service.js";

@Module({
  imports: [DeploymentsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
