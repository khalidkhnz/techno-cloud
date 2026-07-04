import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { PulumiFn } from "@pulumi/pulumi/automation/index.js";

export interface AmplifyProgramArgs {
  name: string;
  repository: string; // full git URL
  branch: string;
  /** Provider access token so Amplify can pull + build the repo. */
  accessToken?: string;
  env?: Record<string, string>;
  tags?: Record<string, string>;
  customDomain?: string;
}

/**
 * Deploy program: an Amplify app + branch connected to the repo. Amplify runs its own managed
 * build/host/CDN/TLS (WEB_COMPUTE supports Next.js SSR). Returns the branch URL.
 */
export function amplifyProgram(args: AmplifyProgramArgs): PulumiFn {
  return async () => {
    const app = new aws.amplify.App(args.name, {
      name: args.name,
      repository: args.repository,
      platform: "WEB_COMPUTE",
      ...(args.accessToken ? { accessToken: args.accessToken } : {}),
      ...(args.env ? { environmentVariables: args.env } : {}),
      ...(args.tags ? { tags: args.tags } : {}),
    });

    const branch = new aws.amplify.Branch(args.name, {
      appId: app.id,
      branchName: args.branch,
      enableAutoBuild: true,
    });

    if (args.customDomain) {
      new aws.amplify.DomainAssociation(args.name, {
        appId: app.id,
        domainName: args.customDomain,
        subDomains: [{ branchName: branch.branchName, prefix: "" }],
      });
    }

    return {
      appId: app.id,
      url: pulumi.interpolate`https://${branch.branchName}.${app.defaultDomain}`,
    };
  };
}
