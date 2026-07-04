import type {
  CommitState,
  Project,
  PushEvent,
  SourceBundle,
  SourceProvider,
  SourceRef,
  WebhookHeaders,
} from "@techno-deployer/core";

interface GitlabPushBody {
  object_kind?: string;
  ref?: string;
  checkout_sha?: string;
  project?: { path_with_namespace?: string };
}

/** GitLab source provider (SaaS or self-hosted via configurable host). */
export class GitlabProvider implements SourceProvider {
  readonly kind = "gitlab" as const;
  constructor(private readonly host = "gitlab.com") {}

  async registerWebhook(_project: Project): Promise<void> {
    // TODO(phase2): create project webhook via GitLab API using a stored token.
  }

  async fetchSource(_ref: SourceRef): Promise<SourceBundle> {
    throw new Error("GitlabProvider.fetchSource: clone runs in CodeBuild (use cloneUrl)");
  }

  async reportStatus(_commit: string, _state: CommitState): Promise<void> {
    // TODO(phase2): POST commit status via the GitLab API.
  }

  parseWebhook(_headers: WebhookHeaders, body: unknown): PushEvent | null {
    const b = body as GitlabPushBody;
    if (b.object_kind !== "push") return null;
    if (!b.ref?.startsWith("refs/heads/")) return null;
    return {
      provider: "gitlab",
      repo: b.project?.path_with_namespace ?? "",
      ref: b.ref.slice("refs/heads/".length),
      commit: b.checkout_sha ?? "",
    };
  }

  cloneUrl(repo: string, token?: string): string {
    return token
      ? `https://oauth2:${token}@${this.host}/${repo}.git`
      : `https://${this.host}/${repo}.git`;
  }
}
