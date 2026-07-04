import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { prefix, tags } from "./config.js";

/**
 * SQS work queues feeding the build/deploy worker Lambdas. Each has a dead-letter queue
 * (maxReceiveCount 5) so poison messages don't loop forever. SQS: 1M req/mo always-free.
 */

function queueWithDlq(name: string) {
  const dlq = new aws.sqs.Queue(`${name}-dlq`, {
    name: `${prefix}-${name}-dlq`,
    messageRetentionSeconds: 1209600, // 14 days
    tags,
  });

  const queue = new aws.sqs.Queue(name, {
    name: `${prefix}-${name}`,
    visibilityTimeoutSeconds: 900, // match Lambda max (15 min)
    redrivePolicy: dlq.arn.apply((arn) =>
      JSON.stringify({ deadLetterTargetArn: arn, maxReceiveCount: 5 }),
    ),
    tags,
  });

  return { queue, dlq };
}

const build = queueWithDlq("build");
const deploy = queueWithDlq("deploy");

export const buildQueue = build.queue;
export const buildDlq = build.dlq;
export const deployQueue = deploy.queue;
export const deployDlq = deploy.dlq;

export const queueArns: pulumi.Output<string>[] = [
  buildQueue.arn,
  deployQueue.arn,
];
