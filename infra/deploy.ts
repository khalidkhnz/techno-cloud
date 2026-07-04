import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { prefix, tags } from "./config.js";
import { codeBuildRole } from "./iam.js";
import { appBoundary } from "./iam.js";
import { lockTable, stateBucket } from "./storage.js";

/**
 * Deploy farm — a CodeBuild project that runs `pulumi up` for a deployment (via the deploy
 * entrypoint). The deploy worker triggers it with DEPLOYMENT_ID/IMAGE_URI overrides. It clones the
 * control-plane repo, installs pulumi + deps, and runs the entrypoint. Secrets come from Parameter
 * Store (DATABASE_URL, PULUMI_CONFIG_PASSPHRASE under `/${prefix}/...`).
 */
const config = new pulumi.Config();
const controlRepo = config.get("controlRepo") ?? "";

const buildspec = `version: 0.2
phases:
  install:
    commands:
      - curl -fsSL https://get.pulumi.com | sh
      - export PATH="$PATH:$HOME/.pulumi/bin"
      - corepack enable
  pre_build:
    commands:
      - git clone --depth 1 "$CONTROL_REPO" app
      - cd app
      - pnpm install --frozen-lockfile
      - pnpm --filter @techno-deployer/api bundle
  build:
    commands:
      - export PATH="$PATH:$HOME/.pulumi/bin"
      - node app/apps/api/dist-lambda/deploy-entrypoint.mjs
`;

export const deployProject = new aws.codebuild.Project("deploy", {
  name: `${prefix}-deploy`,
  serviceRole: codeBuildRole.arn,
  artifacts: { type: "NO_ARTIFACTS" },
  environment: {
    computeType: "BUILD_GENERAL1_SMALL",
    image: "aws/codebuild/amazonlinux2-aarch64-standard:3.0",
    type: "ARM_CONTAINER",
    environmentVariables: [
      { name: "CONTROL_REPO", value: controlRepo },
      { name: "APP_PREFIX", value: prefix },
      { name: "SSM_PREFIX", value: `/${prefix}` },
      { name: "PULUMI_BACKEND_URL", value: pulumi.interpolate`s3://${stateBucket.bucket}` },
      { name: "APP_BOUNDARY_ARN", value: appBoundary.arn },
      { name: "STACK_LOCK_TABLE", value: lockTable.name },
      { name: "DATABASE_URL", value: `/${prefix}/DATABASE_URL`, type: "PARAMETER_STORE" },
      {
        name: "PULUMI_CONFIG_PASSPHRASE",
        value: `/${prefix}/PULUMI_CONFIG_PASSPHRASE`,
        type: "PARAMETER_STORE",
      },
    ],
  },
  source: { type: "NO_SOURCE", buildspec },
  logsConfig: { cloudwatchLogs: { status: "ENABLED", groupName: `${prefix}-deploy` } },
  tags,
});
