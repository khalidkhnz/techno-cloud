/**
 * CloudWatch metrics reader — the usage poller queries these to fill the free-tier meters.
 * Fail-soft: returns 0 on error / missing metric.
 */

import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";

const region = process.env.AWS_REGION ?? "us-east-1";
const client = new CloudWatchClient({ region });

export async function getMetricSum(
  namespace: string,
  metricName: string,
  dimensions: Array<{ Name: string; Value: string }>,
  start: Date,
  end: Date,
): Promise<number> {
  try {
    const res = await client.send(
      new GetMetricStatisticsCommand({
        Namespace: namespace,
        MetricName: metricName,
        Dimensions: dimensions,
        StartTime: start,
        EndTime: end,
        Period: 86_400,
        Statistics: ["Sum"],
      }),
    );
    return (res.Datapoints ?? []).reduce((sum, dp) => sum + (dp.Sum ?? 0), 0);
  } catch {
    return 0;
  }
}
