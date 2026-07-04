import { Body, Controller, Headers, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import type { WebhookHeaders } from "@techno-deployer/core";
import { WebhooksService } from "./webhooks.service.js";

// Public endpoint — authenticated by per-provider webhook signature (verified in the service).
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post(":provider")
  handle(
    @Param("provider") provider: string,
    @Headers() headers: WebhookHeaders,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: unknown,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body ?? {}));
    return this.webhooks.handle(provider, headers, rawBody, body);
  }
}
