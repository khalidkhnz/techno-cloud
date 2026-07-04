import * as pulumi from "@pulumi/pulumi";

/**
 * Platform stack configuration. Set via `pulumi config set techno-deployer:baseDomain ...`.
 * State backend is self-managed S3 (`pulumi login s3://<bucket>`) — see PLAN.md §2.
 */
const config = new pulumi.Config();

export const baseDomain = config.get("baseDomain") ?? "deploy.internal";
export const project = pulumi.getProject();
export const stack = pulumi.getStack();

/** Standard tags applied to every resource for cost attribution (Costs Module). */
export const tags: Record<string, string> = {
  "td:managed-by": "pulumi",
  "td:project": project,
  "td:stack": stack,
  "td:component": "platform",
};

export const prefix = `td-${stack}`;
