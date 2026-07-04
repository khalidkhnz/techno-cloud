import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { baseDomain, prefix, tags } from "./config.js";
import { appBoundary, lambdaRole } from "./iam.js";
import { buildQueue, deployQueue } from "./queues.js";
import { idempotencyTable, lockTable, stateBucket } from "./storage.js";
import { repository } from "./registry.js";
import { buildProject } from "./build.js";
import { deployProject } from "./deploy.js";

/**
 * The platform's OWN serverless compute: the NestJS API (Lambda + Function URL), the SQS build/
 * deploy workers, and the scheduled handlers (usage poller / alerts / reaper) on EventBridge.
 *
 * PACKAGING NOTE: `code` points at the built API bundle. The build step must produce a
 * self-contained bundle (deps included, e.g. esbuild or a node_modules layer) at that path — a bare
 * `nest build` dist is not self-contained. This is wired at AWS-bring-up time (see DEPLOYMENT.md).
 */
const config = new pulumi.Config();
const databaseUrl = config.getSecret("databaseUrl") ?? pulumi.output("");
const betterAuthSecret = config.getSecret("betterAuthSecret") ?? pulumi.output("");
const controlRepo = config.get("controlRepo") ?? "";

const RUNTIME = "nodejs22.x";
const API_BUNDLE = new pulumi.asset.FileArchive("../apps/api/dist");

// AWS_REGION is a reserved Lambda env var — do NOT set it here (Lambda injects it).
const commonEnv: Record<string, pulumi.Input<string>> = {
  APP_PREFIX: prefix,
  APP_BOUNDARY_ARN: appBoundary.arn,
  PULUMI_BACKEND_URL: pulumi.interpolate`s3://${stateBucket.bucket}`,
  SSM_PREFIX: `/${prefix}`,
  STACK_LOCK_TABLE: lockTable.name,
  IDEMPOTENCY_TABLE: idempotencyTable.name,
  BUILD_QUEUE_URL: buildQueue.url,
  DEPLOY_QUEUE_URL: deployQueue.url,
  BUILD_PROJECT_NAME: buildProject.name,
  DEPLOY_PROJECT_NAME: deployProject.name,
  ECR_REGISTRY: repository.repositoryUrl,
  BASE_DOMAIN: baseDomain,
  MAIL_FROM: `no-reply@${baseDomain}`,
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: betterAuthSecret,
};

function fn(name: string, handler: string, opts?: { timeout?: number; memoryMb?: number }) {
  return new aws.lambda.Function(name, {
    name: `${prefix}-${name}`,
    runtime: RUNTIME,
    architectures: ["arm64"],
    handler,
    role: lambdaRole.arn,
    code: API_BUNDLE,
    timeout: opts?.timeout ?? 30,
    memorySize: opts?.memoryMb ?? 512,
    environment: { variables: commonEnv },
    tags,
  });
}

// --- API (Function URL) ---
export const api = fn("api", "lambda.handler");
export const apiUrl = new aws.lambda.FunctionUrl("api", {
  functionName: api.name,
  authorizationType: "NONE",
  cors: { allowOrigins: ["*"], allowMethods: ["*"], allowHeaders: ["*"] },
});

// --- SQS workers ---
const buildWorker = fn("build-worker", "workers/build.worker.handler", { timeout: 60 });
new aws.lambda.EventSourceMapping("build-worker", {
  eventSourceArn: buildQueue.arn,
  functionName: buildWorker.name,
  batchSize: 1,
});

const deployWorker = fn("deploy-worker", "workers/deploy.worker.handler", { timeout: 60 });
new aws.lambda.EventSourceMapping("deploy-worker", {
  eventSourceArn: deployQueue.arn,
  functionName: deployWorker.name,
  batchSize: 1,
});

// --- Scheduled handlers (EventBridge Scheduler) ---
const schedulerRole = new aws.iam.Role("scheduler-role", {
  name: `${prefix}-scheduler`,
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      { Effect: "Allow", Principal: { Service: "scheduler.amazonaws.com" }, Action: "sts:AssumeRole" },
    ],
  }),
  tags,
});

const scheduled: Record<string, { handler: string; rate: string }> = {
  "usage-poller": { handler: "scheduled/usage-poller.handler", rate: "rate(1 hour)" },
  alerts: { handler: "scheduled/alerts.handler", rate: "rate(1 hour)" },
  reaper: { handler: "scheduled/reaper.handler", rate: "rate(1 hour)" },
};

const scheduledFns = Object.entries(scheduled).map(([name, s]) => fn(name, s.handler, { timeout: 120 }));

new aws.iam.RolePolicy("scheduler-invoke", {
  role: schedulerRole.id,
  policy: pulumi
    .all(scheduledFns.map((f) => f.arn))
    .apply((arns) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Action: "lambda:InvokeFunction", Resource: arns }],
      }),
    ),
});

Object.entries(scheduled).forEach(([name, s], i) => {
  new aws.scheduler.Schedule(name, {
    name: `${prefix}-${name}`,
    scheduleExpression: s.rate,
    flexibleTimeWindow: { mode: "OFF" },
    target: { arn: scheduledFns[i]!.arn, roleArn: schedulerRole.arn },
  });
});

// --- Frontend (Amplify) ---
export const web =
  controlRepo !== ""
    ? new aws.amplify.App("web", {
        name: `${prefix}-web`,
        repository: controlRepo,
        platform: "WEB_COMPUTE",
        environmentVariables: { NEXT_PUBLIC_API_URL: apiUrl.functionUrl },
        tags,
      })
    : undefined;
