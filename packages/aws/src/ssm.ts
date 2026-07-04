/**
 * SSM Parameter Store client. Secret env vars are stored as SecureString parameters (free
 * standard tier); the DB keeps only the parameter path. Non-secret vars are stored inline in
 * the DB by the caller. See PLAN.md §9.
 */

import {
  DeleteParameterCommand,
  GetParameterCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

const region = process.env.AWS_REGION ?? "us-east-1";
const client = new SSMClient({ region });

const prefix = (): string => process.env.SSM_PREFIX ?? "/td-dev";

/** Writes a SecureString parameter and returns its full path (stored in the DB). */
export async function putSecret(relativeName: string, value: string): Promise<string> {
  const name = `${prefix()}/${relativeName}`;
  await client.send(
    new PutParameterCommand({ Name: name, Value: value, Type: "SecureString", Overwrite: true }),
  );
  return name;
}

export async function getSecret(name: string): Promise<string | undefined> {
  const res = await client.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  return res.Parameter?.Value;
}

export async function deleteSecret(name: string): Promise<void> {
  await client.send(new DeleteParameterCommand({ Name: name }));
}
