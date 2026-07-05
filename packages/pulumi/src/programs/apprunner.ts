import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { PulumiFn } from "@pulumi/pulumi/automation/index.js";

export interface AppRunnerProgramArgs {
  name: string;
  imageUri: string;
  boundaryArn: string;
  port?: number;
  cpu?: string; // vCPU as "0.25" | "0.5" | "1" | "2"
  memoryMb?: number;
  env?: Record<string, string>;
  tags?: Record<string, string>;
}

// App Runner expects CPU in millicores; map from vCPU.
const APPRUNNER_CPU: Record<string, string> = {
  "0.25": "256",
  "0.5": "512",
  "1": "1024",
  "2": "2048",
};

/** Deploy program: an App Runner service from an ECR image (always-on — no scale-to-zero). */
export function appRunnerProgram(args: AppRunnerProgramArgs): PulumiFn {
  return async () => {
    const accessRole = new aws.iam.Role(`${args.name}-ecr`, {
      name: `${args.name}-ecr`,
      permissionsBoundary: args.boundaryArn,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "build.apprunner.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    });

    new aws.iam.RolePolicyAttachment(`${args.name}-ecr-access`, {
      role: accessRole.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess",
    });

    const service = new aws.apprunner.Service(args.name, {
      serviceName: args.name,
      sourceConfiguration: {
        authenticationConfiguration: { accessRoleArn: accessRole.arn },
        autoDeploymentsEnabled: false,
        imageRepository: {
          imageIdentifier: args.imageUri,
          imageRepositoryType: "ECR",
          imageConfiguration: {
            port: String(args.port ?? 8080),
            ...(args.env ? { runtimeEnvironmentVariables: args.env } : {}),
          },
        },
      },
      instanceConfiguration: {
        cpu: APPRUNNER_CPU[args.cpu ?? "1"] ?? "1024",
        memory: String(args.memoryMb ?? 2048),
      },
      tags: args.tags,
    });

    return { url: pulumi.interpolate`https://${service.serviceUrl}` };
  };
}
