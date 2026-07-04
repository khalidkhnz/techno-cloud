/**
 * Platform infrastructure (Pulumi). Provisions the serverless control-plane backbone:
 *   S3 (Pulumi state, artifacts) · DynamoDB (stack locks, idempotency) · SQS (build/deploy + DLQs)
 *   ECR · Route 53 zone · ACM wildcard cert · IAM roles (CodeBuild, Lambdas).
 * No NAT Gateway, no ALB, no RDS, no Redis. See PHASE1_TODO.md §10.
 *
 * State backend: self-managed S3 (`pulumi login s3://<state-bucket>`). Note the bootstrap
 * chicken-and-egg — the state bucket is created here but can be migrated to self-managed
 * backend after first apply, or created out-of-band. See README/PLAN §2.
 */

import { artifactsBucket, idempotencyTable, lockTable, stateBucket } from "./storage.js";
import { buildQueue, buildDlq, deployQueue, deployDlq } from "./queues.js";
import { repository } from "./registry.js";
import { certificate, zone } from "./dns.js";
import { codeBuildRole, lambdaRole } from "./iam.js";
import { buildProject } from "./build.js";
import { deployProject } from "./deploy.js";
import { baseDomain } from "./config.js";

// --- Stack outputs (consumed by the app via Parameter Store / env) ---
export const region = "us-east-1";
export const platformBaseDomain = baseDomain;

export const pulumiStateBucket = stateBucket.bucket;
export const artifactsBucketName = artifactsBucket.bucket;

export const stackLockTable = lockTable.name;
export const idempotencyTableName = idempotencyTable.name;

export const buildQueueUrl = buildQueue.url;
export const buildDlqUrl = buildDlq.url;
export const deployQueueUrl = deployQueue.url;
export const deployDlqUrl = deployDlq.url;

export const ecrRepositoryUrl = repository.repositoryUrl;
export const buildProjectName = buildProject.name;
export const deployProjectName = deployProject.name;

export const hostedZoneId = zone.zoneId;
export const nameServers = zone.nameServers;
export const wildcardCertificateArn = certificate.arn;

export const codeBuildRoleArn = codeBuildRole.arn;
export const lambdaRoleArn = lambdaRole.arn;
