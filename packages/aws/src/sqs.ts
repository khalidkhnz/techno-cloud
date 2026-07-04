/**
 * Thin SQS producer. Workers (build/deploy) consume via Lambda SQS event-source mappings.
 * If the queue URL is unset (e.g. local dev without infra), enqueue is a logged no-op so the
 * control plane still runs.
 */

import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const region = process.env.AWS_REGION ?? "us-east-1";
const client = new SQSClient({ region });

export interface BuildJob {
  deploymentId: string;
  projectId: string;
}

export interface DeployJob {
  deploymentId: string;
  projectId: string;
  imageUri?: string;
}

async function enqueue(queueUrl: string | undefined, body: unknown, label: string): Promise<void> {
  if (!queueUrl) {
    // eslint-disable-next-line no-console
    console.warn(`[sqs] ${label} queue URL not set — skipping enqueue (local mode).`);
    return;
  }
  await client.send(
    new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(body) }),
  );
}

export const enqueueBuild = (job: BuildJob): Promise<void> =>
  enqueue(process.env.BUILD_QUEUE_URL, job, "build");

export const enqueueDeploy = (job: DeployJob): Promise<void> =>
  enqueue(process.env.DEPLOY_QUEUE_URL, job, "deploy");
