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
import { PlatformConfigService } from "../platform-config/platform-config.service.js";

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
    private readonly platformConfig: PlatformConfigService,
  ) {}

  private matchProjects(kind: SourceProviderKind, repo: string) {
    return this.db
      .select()
      .from(projects)
      .where(
        and(
          sql`${projects.source}->>'provider' = ${kind}`,
          sql`${projects.source}->>'repo' = ${repo}`,
        ),
      );
  }

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

    // Push → production deploy of matching projects.
    const push = driver.parseWebhook(headers, body);
    if (push) {
      const matches = (await this.matchProjects(kind, push.repo)).filter(
        (p) => {
          const src = p.source as { ref?: string };
          return !src.ref || src.ref === push.ref;
        },
      );
      const deploymentIds: string[] = [];
      for (const project of matches) {
        const d = await this.deployments.create(project.id, push.commit);
        deploymentIds.push(d.id);
      }
      return { ref: push.ref, commit: push.commit, deployments: deploymentIds };
    }

    // Pull request → ephemeral preview deploy (opened) or teardown (closed), gated by flag.
    const pr = driver.parsePullRequest(headers, body);
    if (pr) {
      const config = await this.platformConfig.get();
      if (!config.routing.previews) return { ignored: "previews disabled" as const };

      const matches = await this.matchProjects(kind, pr.repo);
      const deploymentIds: string[] = [];
      for (const project of matches) {
        if (pr.action === "opened") {
          const d = await this.deployments.createPreview(project.id, pr.number, pr.ref, pr.commit);
          deploymentIds.push(d.id);
        } else {
          await this.deployments.destroyPreview(project.id, pr.number);
        }
      }
      return { pr: pr.number, action: pr.action, deployments: deploymentIds };
    }

    return { ignored: true as const };
  }
}
