/**
 * CloudWatch Logs reader — powers the UI's log polling. Build logs live in the CodeBuild project's
 * log group; runtime logs depend on the target (e.g. /aws/lambda/<name>). Fail-soft: returns [].
 */

import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const region = process.env.AWS_REGION ?? "us-east-1";
const client = new CloudWatchLogsClient({ region });

export interface LogEvent {
  timestamp: number;
  message: string;
}

export async function fetchLogs(
  logGroupName: string,
  opts?: { startTime?: number; limit?: number },
): Promise<LogEvent[]> {
  try {
    const res = await client.send(
      new FilterLogEventsCommand({
        logGroupName,
        startTime: opts?.startTime,
        limit: opts?.limit ?? 200,
      }),
    );
    return (res.events ?? []).map((e) => ({
      timestamp: e.timestamp ?? 0,
      message: e.message ?? "",
    }));
  } catch {
    return []; // log group may not exist yet, or no permissions in local mode
  }
}
