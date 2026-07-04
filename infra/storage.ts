import * as aws from "@pulumi/aws";
import { prefix, tags } from "./config.js";

/**
 * Durable + ephemeral state stores.
 * - S3: Pulumi state backend, build artifacts / zips / static output, build cache.
 * - DynamoDB: stack locks (serialize `pulumi up` per project:env) and idempotency keys.
 * All buckets are private with versioning; DynamoDB is on-demand (25 GB always-free).
 */

// --- S3 buckets ---
export const stateBucket = new aws.s3.BucketV2("pulumi-state", {
  bucket: `${prefix}-pulumi-state`,
  tags,
});

new aws.s3.BucketVersioningV2("pulumi-state-versioning", {
  bucket: stateBucket.id,
  versioningConfiguration: { status: "Enabled" },
});

new aws.s3.BucketPublicAccessBlock("pulumi-state-pab", {
  bucket: stateBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

export const artifactsBucket = new aws.s3.BucketV2("artifacts", {
  bucket: `${prefix}-artifacts`,
  tags,
});

new aws.s3.BucketPublicAccessBlock("artifacts-pab", {
  bucket: artifactsBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

// --- DynamoDB tables (on-demand / PAY_PER_REQUEST) ---
export const lockTable = new aws.dynamodb.Table("stack-locks", {
  name: `${prefix}-stack-locks`,
  billingMode: "PAY_PER_REQUEST",
  hashKey: "lockId",
  attributes: [{ name: "lockId", type: "S" }],
  tags,
});

export const idempotencyTable = new aws.dynamodb.Table("idempotency", {
  name: `${prefix}-idempotency`,
  billingMode: "PAY_PER_REQUEST",
  hashKey: "key",
  attributes: [{ name: "key", type: "S" }],
  ttl: { attributeName: "expiresAt", enabled: true },
  tags,
});
