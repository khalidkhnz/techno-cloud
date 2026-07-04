import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import type { WebhookHeaders } from "@techno-deployer/core";
import { WebhooksService } from "./webhooks.service.js";

// Public endpoint — called by the git provider. Signature verification is a TODO (see service).
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post(":provider")
  handle(
    @Param("provider") provider: string,
    @Headers() headers: WebhookHeaders,
    @Body() body: unknown,
  ) {
    return this.webhooks.handle(provider, headers, body);
  }
}
