import * as aws from "@pulumi/aws";
import type { PulumiFn } from "@pulumi/pulumi/automation/index.js";

export interface LambdaProgramArgs {
  /** Resource base name — MUST match the `${prefix}-app-*` pattern the CodeBuild role can manage. */
  name: string;
  imageUri: string;
  /** Permissions boundary ARN required on the app role (enforced by the CodeBuild IAM policy). */
  boundaryArn: string;
  env?: Record<string, string>;
  memoryMb?: number;
  tags?: Record<string, string>;
}

/**
 * Deploy program: a container-image Lambda (arm64) behind a public Function URL. Creates a
 * per-app execution role carrying the permissions boundary. Route53 subdomain mapping needs
 * CloudFront in front of the Function URL — deferred (returns the Function URL directly).
 */
export function lambdaProgram(args: LambdaProgramArgs): PulumiFn {
  return async () => {
    const role = new aws.iam.Role(`${args.name}-role`, {
      name: `${args.name}-role`,
      permissionsBoundary: args.boundaryArn,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          { Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole" },
        ],
      }),
    });

    new aws.iam.RolePolicyAttachment(`${args.name}-logs`, {
      role: role.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    });

    const fn = new aws.lambda.Function(args.name, {
      name: args.name,
      packageType: "Image",
      imageUri: args.imageUri,
      role: role.arn,
      architectures: ["arm64"],
      memorySize: args.memoryMb ?? 512,
      timeout: 30,
      ...(args.env ? { environment: { variables: args.env } } : {}),
      ...(args.tags ? { tags: args.tags } : {}),
    });

    const url = new aws.lambda.FunctionUrl(args.name, {
      functionName: fn.name,
      authorizationType: "NONE",
    });

    return { url: url.functionUrl, functionArn: fn.arn };
  };
}
