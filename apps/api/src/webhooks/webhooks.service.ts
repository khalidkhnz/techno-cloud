import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { projects, sql, type Db } from "@techno-deployer/db";
import type { SourceProviderKind, WebhookHeaders } from "@techno-deployer/core";
import { createSourceRegistry } from "@techno-deployer/providers";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { DeploymentsService } from "../deployments/deployments.service.js";

const VALID: SourceProviderKind[] = ["github", "gitlab", "bitbucket"];

@Injectable()
export class WebhooksService {
  private readonly registry = createSourceRegistry();

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly deployments: DeploymentsService,
  ) {}

  // TODO(phase3-security): verify provider webhook signatures before trusting the payload.
  async handle(provider: string, headers: WebhookHeaders, body: unknown) {
    if (!VALID.includes(provider as SourceProviderKind)) {
      throw new BadRequestException(`Unknown provider "${provider}"`);
    }
    const event = this.registry.get(provider as SourceProviderKind).parseWebhook(headers, body);
    if (!event) return { ignored: true as const };

    // Match projects whose source repo equals the pushed repo.
    const matches = await this.db
      .select()
      .from(projects)
      .where(sql`${projects.source}->>'repo' = ${event.repo}`);

    const deploymentIds: string[] = [];
    for (const project of matches) {
      const d = await this.deployments.create(project.id);
      deploymentIds.push(d.id);
    }
    return { ref: event.ref, commit: event.commit, deployments: deploymentIds };
  }
}
