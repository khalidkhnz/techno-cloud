/**
 * SourceProvider — the pluggable git/source driver interface. One implementation per
 * source (github, gitlab, bitbucket, zip). See PLAN.md §4.
 */

import type { SourceProviderKind } from "./config.js";
import type { CommitState, Project, PushEvent, SourceBundle, SourceRef } from "./domain.js";

export type WebhookHeaders = Record<string, string | string[] | undefined>;

export interface SourceProvider {
  readonly kind: SourceProviderKind;

  registerWebhook(project: Project): Promise<void>;
  /** Clone or unzip the source and stage a normalized bundle in S3. */
  fetchSource(ref: SourceRef): Promise<SourceBundle>;
  /** Report build/deploy status back to the provider (commit check). No-op for zip. */
  reportStatus(commit: string, state: CommitState): Promise<void>;
  /**
   * Verify the webhook signature/token against the configured secret using the RAW request
   * body (JSON re-serialization breaks HMAC). Fail-closed: returns false when unverifiable.
   */
  verifySignature(headers: WebhookHeaders, rawBody: Uint8Array, secret: string): boolean;
  /** Parse an incoming webhook into a normalized push event (null if not a push we deploy). */
  parseWebhook(headers: WebhookHeaders, body: unknown): PushEvent | null;
  /** Build an authenticated clone URL (token optional for public repos). */
  cloneUrl(repo: string, token?: string): string;
}

export class SourceProviderRegistry {
  private readonly providers = new Map<SourceProviderKind, SourceProvider>();

  register(provider: SourceProvider): void {
    this.providers.set(provider.kind, provider);
  }

  get(kind: SourceProviderKind): SourceProvider {
    const provider = this.providers.get(kind);
    if (!provider) throw new Error(`No SourceProvider registered for kind "${kind}"`);
    return provider;
  }
}
