import type {
  CommitState,
  Project,
  PushEvent,
  SourceBundle,
  SourceProvider,
  SourceRef,
  WebhookHeaders,
} from "@techno-deployer/core";
import { firstHeader, hmacSha256Hex, safeEqual } from "./util.js";

interface BitbucketPushBody {
  push?: {
    changes?: Array<{
      new?: { name?: string; type?: string; target?: { hash?: string } };
    }>;
  };
  repository?: { full_name?: string };
}

/** Bitbucket Cloud source provider. */
export class BitbucketProvider implements SourceProvider {
  readonly kind = "bitbucket" as const;

  async registerWebhook(_project: Project): Promise<void> {
    // TODO(phase2): create repo webhook via the Bitbucket API.
  }

  async fetchSource(_ref: SourceRef): Promise<SourceBundle> {
    throw new Error("BitbucketProvider.fetchSource: clone runs in CodeBuild (use cloneUrl)");
  }

  async reportStatus(_commit: string, _state: CommitState): Promise<void> {
    // TODO(phase2): POST build status via the Bitbucket API.
  }

  verifySignature(headers: WebhookHeaders, rawBody: Uint8Array, secret: string): boolean {
    const sig = firstHeader(headers, "x-hub-signature");
    if (!sig || !secret) return false;
    return safeEqual(sig, hmacSha256Hex(rawBody, secret));
  }

  parseWebhook(headers: WebhookHeaders, body: unknown): PushEvent | null {
    if (firstHeader(headers, "x-event-key") !== "repo:push") return null;
    const b = body as BitbucketPushBody;
    const change = b.push?.changes?.[0]?.new;
    if (!change || change.type !== "branch") return null;
    return {
      provider: "bitbucket",
      repo: b.repository?.full_name ?? "",
      ref: change.name ?? "",
      commit: change.target?.hash ?? "",
    };
  }

  cloneUrl(repo: string, token?: string): string {
    return token
      ? `https://x-token-auth:${token}@bitbucket.org/${repo}.git`
      : `https://bitbucket.org/${repo}.git`;
  }
}
