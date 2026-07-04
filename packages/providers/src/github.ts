import type {
  CommitState,
  Project,
  PushEvent,
  SourceBundle,
  SourceProvider,
  SourceRef,
  WebhookHeaders,
} from "@techno-deployer/core";
import { firstHeader } from "./util.js";

interface GithubPushBody {
  ref?: string;
  after?: string;
  repository?: { full_name?: string };
}

/** GitHub App source provider. Cloning runs in CodeBuild via `cloneUrl`. */
export class GithubProvider implements SourceProvider {
  readonly kind = "github" as const;

  async registerWebhook(_project: Project): Promise<void> {
    // GitHub App receives push webhooks at the app level; per-repo hooks not required.
  }

  async fetchSource(_ref: SourceRef): Promise<SourceBundle> {
    throw new Error("GithubProvider.fetchSource: clone runs in CodeBuild (use cloneUrl)");
  }

  async reportStatus(_commit: string, _state: CommitState): Promise<void> {
    // TODO(phase2): POST commit status via the GitHub API.
  }

  parseWebhook(headers: WebhookHeaders, body: unknown): PushEvent | null {
    if (firstHeader(headers, "x-github-event") !== "push") return null;
    const b = body as GithubPushBody;
    if (!b.ref?.startsWith("refs/heads/")) return null;
    return {
      provider: "github",
      repo: b.repository?.full_name ?? "",
      ref: b.ref.slice("refs/heads/".length),
      commit: b.after ?? "",
    };
  }

  cloneUrl(repo: string, token?: string): string {
    return token
      ? `https://x-access-token:${token}@github.com/${repo}.git`
      : `https://github.com/${repo}.git`;
  }
}
