/**
 * Run a shell command on an EC2 instance via SSM Run Command and return its stdout. Used to read
 * the live Nginx config from an existing instance (for the create-flow diff) and, at deploy time,
 * to append an app's server block to an already-running host. Fail-soft: returns null if the
 * instance isn't SSM-managed, creds are missing, or the command times out.
 */

import {
  GetCommandInvocationCommand,
  SendCommandCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

const region = process.env.AWS_REGION ?? "us-east-1";

export async function runShellOnInstance(
  instanceId: string,
  command: string,
  opts?: { region?: string; timeoutMs?: number },
): Promise<string | null> {
  const client = new SSMClient({ region: opts?.region ?? region });
  const deadline = Date.now() + (opts?.timeoutMs ?? 12_000);
  try {
    const sent = await client.send(
      new SendCommandCommand({
        InstanceIds: [instanceId],
        DocumentName: "AWS-RunShellScript",
        Parameters: { commands: [command] },
        TimeoutSeconds: 30,
      }),
    );
    const commandId = sent.Command?.CommandId;
    if (!commandId) return null;

    // Poll until the invocation reaches a terminal state.
    for (;;) {
      if (Date.now() > deadline) return null;
      await sleep(1200);
      try {
        const inv = await client.send(
          new GetCommandInvocationCommand({ CommandId: commandId, InstanceId: instanceId }),
        );
        const status = inv.Status;
        if (status === "Success") return inv.StandardOutputContent ?? "";
        if (status && ["Cancelled", "TimedOut", "Failed", "Undeliverable"].includes(status)) {
          return null;
        }
      } catch {
        // invocation not registered yet — keep polling until the deadline
      }
    }
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
