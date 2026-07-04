import type {
  Project,
  PushEvent,
  SourceBundle,
  SourceProvider,
  SourceRef,
  WebhookHeaders,
} from "@techno-deployer/core";

/** Zip-upload source provider — no webhooks/clone; source is an uploaded S3 object. */
export class ZipProvider implements SourceProvider {
  readonly kind = "zip" as const;

  async registerWebhook(_project: Project): Promise<void> {
    // No webhooks for zip uploads.
  }

  async fetchSource(_ref: SourceRef): Promise<SourceBundle> {
    // TODO(phase1): download zipKey from S3 → unzip → re-stage bundle, detect Dockerfile.
    throw new Error("ZipProvider.fetchSource not implemented");
  }

  async reportStatus(): Promise<void> {
    // No commit status for zip uploads.
  }

  parseWebhook(_headers: WebhookHeaders, _body: unknown): PushEvent | null {
    return null; // zip uploads are not webhook-driven
  }

  cloneUrl(): string {
    throw new Error("ZipProvider has no clone URL");
  }
}
