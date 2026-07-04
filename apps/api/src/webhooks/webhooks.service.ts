import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { and, projects, sql, type Db } from "@techno-deployer/db";
import type { SourceProviderKind, WebhookHeaders } from "@techno-deployer/core";
import { createSourceRegistry } from "@techno-deployer/providers";
import { env } from "@techno-deployer/env";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { DeploymentsService } from "../deployments/deployments.service.js";

const VALID: SourceProviderKind[] = ["github", "gitlab", "bitbucket"];

const SECRETS: Record<string, string | undefined> = {
  github: env.GITHUB_WEBHOOK_SECRET,
  gitlab: env.GITLAB_WEBHOOK_SECRET,
  bitbucket: env.BITBUCKET_WEBHOOK_SECRET,
};

@Injectable()
export class WebhooksService {
  private readonly registry = createSourceRegistry();

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly deployments: DeploymentsService,
  ) {}

  async handle(provider: string, headers: WebhookHeaders, rawBody: Uint8Array, body: unknown) {
    if (!VALID.includes(provider as SourceProviderKind)) {
      throw new BadRequestException(`Unknown provider "${provider}"`);
    }
    const kind = provider as SourceProviderKind;
    const driver = this.registry.get(kind);

    // Fail-closed: reject unless a configured secret validates the signature over the raw body.
    const secret = SECRETS[kind];
    if (!secret || !driver.verifySignature(headers, rawBody, secret)) {
      throw new UnauthorizedException("Invalid or missing webhook signature");
    }

    const event = driver.parseWebhook(headers, body);
    if (!event) return { ignored: true as const };

    // Match only projects from the SAME provider + repo, and (when the project pins a ref) the
    // same branch — so a push can't trigger cross-provider or wrong-branch deployments.
    const matches = await this.db
      .select()
      .from(projects)
      .where(
        and(
          sql`${projects.source}->>'provider' = ${kind}`,
          sql`${projects.source}->>'repo' = ${event.repo}`,
          sql`(${projects.source}->>'ref' IS NULL OR ${projects.source}->>'ref' = ${event.ref})`,
        ),
      );

    const deploymentIds: string[] = [];
    for (const project of matches) {
      // Deploy the exact commit that triggered the webhook.
      const d = await this.deployments.create(project.id, event.commit);
      deploymentIds.push(d.id);
    }
    return { ref: event.ref, commit: event.commit, deployments: deploymentIds };
  }
}
