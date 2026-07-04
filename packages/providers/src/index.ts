import { SourceProviderRegistry } from "@techno-deployer/core";
import { GithubProvider } from "./github.js";
import { GitlabProvider } from "./gitlab.js";
import { BitbucketProvider } from "./bitbucket.js";
import { ZipProvider } from "./zip.js";

export { GithubProvider } from "./github.js";
export { GitlabProvider } from "./gitlab.js";
export { BitbucketProvider } from "./bitbucket.js";
export { ZipProvider } from "./zip.js";
export { firstHeader } from "./util.js";

export function createSourceRegistry(): SourceProviderRegistry {
  const registry = new SourceProviderRegistry();
  registry.register(new GithubProvider());
  registry.register(new GitlabProvider());
  registry.register(new BitbucketProvider());
  registry.register(new ZipProvider());
  return registry;
}
