/**
 * DynamoDB-backed distributed lock. Serializes `pulumi up` per `project:env` stack (replaces
 * the Redis lock from the always-on design). Uses a conditional PutItem so only one holder
 * wins; stale locks (past their TTL) can be reclaimed. See PLAN.md §5.
 */

import {
  ConditionalCheckFailedException,
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const region = process.env.AWS_REGION ?? "us-east-1";
const lockTable = () => process.env.STACK_LOCK_TABLE ?? "td-dev-stack-locks";

const client = new DynamoDBClient({ region });

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 min (Lambda/CodeBuild ceiling)

export async function acquireLock(lockId: string, ttlMs = DEFAULT_TTL_MS): Promise<boolean> {
  const now = Date.now();
  try {
    await client.send(
      new PutItemCommand({
        TableName: lockTable(),
        Item: {
          lockId: { S: lockId },
          expiresAt: { N: String(now + ttlMs) },
        },
        // Acquire if no holder, or the existing holder's lock has expired.
        ConditionExpression: "attribute_not_exists(lockId) OR expiresAt < :now",
        ExpressionAttributeValues: { ":now": { N: String(now) } },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

export async function releaseLock(lockId: string): Promise<void> {
  await client.send(
    new DeleteItemCommand({
      TableName: lockTable(),
      Key: { lockId: { S: lockId } },
    }),
  );
}

const idempotencyTable = () => process.env.IDEMPOTENCY_TABLE ?? "td-dev-idempotency";

/**
 * Claim an idempotency key. Returns true the FIRST time (proceed), false if already claimed
 * (skip — the SQS message is a duplicate/redelivery). Backs idempotent worker handlers.
 */
export async function claimIdempotency(key: string, ttlMs = 24 * 60 * 60 * 1000): Promise<boolean> {
  try {
    await client.send(
      new PutItemCommand({
        TableName: idempotencyTable(),
        Item: { key: { S: key }, expiresAt: { N: String(Math.floor((Date.now() + ttlMs) / 1000)) } },
        ConditionExpression: "attribute_not_exists(#k)",
        ExpressionAttributeNames: { "#k": "key" },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/** Run `fn` while holding the lock; always releases. Throws if the lock can't be acquired. */
export async function withLock<T>(lockId: string, fn: () => Promise<T>): Promise<T> {
  const acquired = await acquireLock(lockId);
  if (!acquired) {
    throw new Error(`Could not acquire lock "${lockId}" — another run holds it.`);
  }
  try {
    return await fn();
  } finally {
    await releaseLock(lockId);
  }
}
