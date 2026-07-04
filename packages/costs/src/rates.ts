/**
 * Rate card — verified against official pricing pages, us-east-1, as of 2026-07-04.
 * Single source of truth mirrors PRICING_REFERENCE.md. Keep `AS_OF` current; a scheduled
 * job (Phase 4) flags rates older than 90 days for re-verification.
 */

export const AS_OF = "2026-07-04";
export const REGION = "us-east-1";

export interface Rate {
  unit: string;
  priceUsd: number;
  source: string;
}

export const RATES = {
  // --- Lambda (arm64 preferred) --- https://aws.amazon.com/lambda/pricing/
  lambdaRequests: { unit: "per 1M requests", priceUsd: 0.2, source: "aws.amazon.com/lambda/pricing" },
  lambdaGbSecondX86: { unit: "per GB-second", priceUsd: 0.0000166667, source: "aws.amazon.com/lambda/pricing" },
  lambdaGbSecondArm: { unit: "per GB-second", priceUsd: 0.0000133334, source: "aws.amazon.com/lambda/pricing" },

  // --- Fargate --- https://aws.amazon.com/fargate/pricing/
  fargateVcpuHrX86: { unit: "per vCPU-hr", priceUsd: 0.04048, source: "aws.amazon.com/fargate/pricing" },
  fargateGbHrX86: { unit: "per GB-hr", priceUsd: 0.004445, source: "aws.amazon.com/fargate/pricing" },
  fargateVcpuHrArm: { unit: "per vCPU-hr", priceUsd: 0.03238, source: "aws.amazon.com/fargate/pricing" },
  fargateGbHrArm: { unit: "per GB-hr", priceUsd: 0.003559, source: "aws.amazon.com/fargate/pricing" },

  // --- App Runner --- https://aws.amazon.com/apprunner/pricing/
  appRunnerVcpuHr: { unit: "per vCPU-hr (active)", priceUsd: 0.064, source: "aws.amazon.com/apprunner/pricing" },
  appRunnerGbHr: { unit: "per GB-hr", priceUsd: 0.007, source: "aws.amazon.com/apprunner/pricing" },

  // --- EC2 on-demand (arm/Graviton) --- https://aws.amazon.com/ec2/pricing/on-demand/
  ec2T4gSmallHr: { unit: "per hr", priceUsd: 0.0168, source: "aws.amazon.com/ec2/pricing/on-demand" },
  ec2T4gMediumHr: { unit: "per hr", priceUsd: 0.0336, source: "aws.amazon.com/ec2/pricing/on-demand" },
  ebsGp3GbMonth: { unit: "per GB-month", priceUsd: 0.08, source: "aws.amazon.com/ebs/pricing" },

  // --- Amplify Hosting --- https://aws.amazon.com/amplify/pricing/  (12-month free tier)
  amplifyBuildMin: { unit: "per build-minute", priceUsd: 0.01, source: "aws.amazon.com/amplify/pricing" },
  amplifyStorageGbMonth: { unit: "per GB-month", priceUsd: 0.023, source: "aws.amazon.com/amplify/pricing" },
  amplifyServedGb: { unit: "per GB served", priceUsd: 0.15, source: "aws.amazon.com/amplify/pricing" },
  amplifySsrRequests: { unit: "per 1M SSR requests", priceUsd: 0.3, source: "aws.amazon.com/amplify/pricing" },
  amplifySsrGbHr: { unit: "per GB-hr SSR", priceUsd: 0.2, source: "aws.amazon.com/amplify/pricing" },

  // --- CloudFront --- https://aws.amazon.com/cloudfront/pricing/ (1 TB + 10M req always-free)
  cloudfrontDataOutGb: { unit: "per GB out (US)", priceUsd: 0.085, source: "aws.amazon.com/cloudfront/pricing" },
  cloudfrontHttpsPer10k: { unit: "per 10k HTTPS req", priceUsd: 0.01, source: "aws.amazon.com/cloudfront/pricing" },

  // --- S3 --- https://aws.amazon.com/s3/pricing/
  s3StorageGbMonth: { unit: "per GB-month", priceUsd: 0.023, source: "aws.amazon.com/s3/pricing" },

  // --- Route 53 --- https://aws.amazon.com/route53/pricing/
  route53HostedZoneMonth: { unit: "per zone-month", priceUsd: 0.5, source: "aws.amazon.com/route53/pricing" },

  // --- CodeBuild --- https://aws.amazon.com/codebuild/pricing/ (100 min/mo always-free)
  codeBuildSmallMin: { unit: "per build-minute (general1.small)", priceUsd: 0.005, source: "aws.amazon.com/codebuild/pricing" },

  // --- Serverless glue ---
  sqsPer1M: { unit: "per 1M requests", priceUsd: 0.4, source: "aws.amazon.com/sqs/pricing" },
  dynamoWritePer1M: { unit: "per 1M writes", priceUsd: 0.625, source: "aws.amazon.com/dynamodb/pricing/on-demand" },
  dynamoReadPer1M: { unit: "per 1M reads", priceUsd: 0.125, source: "aws.amazon.com/dynamodb/pricing/on-demand" },
  dynamoStorageGbMonth: { unit: "per GB-month", priceUsd: 0.25, source: "aws.amazon.com/dynamodb/pricing" },
  cloudwatchIngestGb: { unit: "per GB ingest", priceUsd: 0.5, source: "aws.amazon.com/cloudwatch/pricing" },
  cloudwatchStorageGbMonth: { unit: "per GB-month", priceUsd: 0.03, source: "aws.amazon.com/cloudwatch/pricing" },
} as const satisfies Record<string, Rate>;

/** Always-free monthly allowances that survive the 2025 AWS Free Tier change. */
export const FREE_TIER = {
  lambdaRequests: 1_000_000,
  lambdaGbSeconds: 400_000,
  sqsRequests: 1_000_000,
  dynamoStorageGb: 25,
  cloudwatchIngestGb: 5,
  codeBuildMinutes: 100,
  eventbridgeSchedulerInvocations: 14_000_000,
  cloudfrontDataOutGb: 1024,
  cloudfrontRequests: 10_000_000,
} as const;

export const HOURS_PER_MONTH = 730;
