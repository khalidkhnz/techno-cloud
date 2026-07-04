import { SourceProviderRegistry } from "@techno-deployer/core";
import type {
  CommitState,
  Project,
  SourceBundle,
  SourceProvider,
  SourceRef,
} from "@techno-deployer/core";

/** GitHub App source provider — webhooks + clone via installation token. Stubbed for Phase 1. */
export class GithubProvider implements SourceProvider {
  readonly kind = "github" as const;

  async registerWebhook(_project: Project): Promise<void> {
    throw new Error("GithubProvider.registerWebhook not implemented");
  }

  async fetchSource(_ref: SourceRef): Promise<SourceBundle> {
    // TODO(phase1): clone via installation token → tar → S3, detect Dockerfile.
    throw new Error("GithubProvider.fetchSource not implemented");
  }

  async reportStatus(_commit: string, _state: CommitState): Promise<void> {
    throw new Error("GithubProvider.reportStatus not implemented");
  }
}

/** Zip-upload source provider — unzip an S3 object into a normalized bundle. Stubbed for Phase 1. */
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
}

export function createSourceRegistry(): SourceProviderRegistry {
  const registry = new SourceProviderRegistry();
  registry.register(new GithubProvider());
  registry.register(new ZipProvider());
  return registry;
}
