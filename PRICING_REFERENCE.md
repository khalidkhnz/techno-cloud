# Pricing Reference (verified facts)

Single source of truth for every rate used in `COST_BREAKDOWN.md` and the Costs Module.
All figures **us-east-1 (N. Virginia)**, **on-demand**, **as of 2026-07-04**, taken from official
vendor pricing pages. No estimates in this file — only published rates. Estimates/derived numbers
live in `COST_BREAKDOWN.md`.

> ⚠️ **Re-verify before budgeting.** Cloud pricing changes. Confirm against
> [calculator.aws](https://calculator.aws) and the source links below.

---

## AWS Free Tier model — the important context

AWS changed its Free Tier on **2025-07-15**:

- **New accounts (on/after 2025-07-15):** pick a **Free Plan** (no charges until upgrade; expires after
  **6 months or when credits run out**; some services restricted) or a **Paid Plan** (on-demand rates,
  all services). Both grant **up to $200 in credits** ($100 signup + up to $100 from activities),
  credits expire **12 months** after account creation.
- **Always-free services survive under BOTH the new and legacy programs.** A new 2026 account still
  gets the recurring monthly always-free allowances below.
- **Legacy accounts (before 2025-07-15):** keep the classic model (12-month trials + always-free).

Source: [AWS Free Tier update](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits/) · [Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/)

### Always-free (never expires, recurring monthly)
| Service | Always-free allowance/month |
|---|---|
| Lambda | 1,000,000 requests + 400,000 GB-seconds |
| SQS | 1,000,000 requests |
| DynamoDB | 25 GB storage (+25 WCU/25 RCU) — *strongly implied always-free; label not verbatim on current page* |
| SNS | 1,000,000 publishes |
| CloudWatch Logs | 5 GB ingestion (+ basic monitoring) |
| CloudFront | 1 TB data-out + 10,000,000 requests (always-free since 2021-12-01) |
| CodeBuild | 100 build-minutes (general1.small / arm1.small) — page states it does *not* expire |
| EventBridge Scheduler | 14,000,000 invocations |
| Parameter Store (standard) | Free (standard params + standard throughput) |
| ACM | Public certs for integrated services free |

### 12-month / credit-model only (NOT always-free)
| Service | Note |
|---|---|
| AWS Amplify Hosting | Page says **"Free for 12 months"** (not always-free) |
| EC2 | Legacy 750 hrs 12-mo; new accounts → credit model |
| S3 | Classic fixed allowances no longer published; now credit-model |
| API Gateway (WebSocket/HTTP/REST) | 1M free, **12-month only** |
| RDS | 12-month legacy |

---

## Compute

### AWS Lambda — [source](https://aws.amazon.com/lambda/pricing/)
- Requests: **$0.20 / 1M** (after 1M always-free)
- Duration x86: **$0.0000166667 / GB-second**
- Duration **arm64/Graviton: $0.0000133334 / GB-second (~20% cheaper)** ← use arm64
- Always-free: 1M req + 400,000 GB-s / month
- **Lambda Function URLs: no additional charge** (HTTPS endpoint is free; pay only invocation+duration)

### AWS Fargate (ECS) — [source](https://aws.amazon.com/fargate/pricing/)
- x86: **$0.04048 / vCPU-hr**, **$0.004445 / GB-hr**
- arm64: **$0.032380 / vCPU-hr**, **$0.003559 / GB-hr**
- Fargate Spot: **up to 70% off**
- Free tier: **none**

### AWS App Runner — [source](https://aws.amazon.com/apprunner/pricing/)
- Active vCPU: **$0.064 / vCPU-hr**; memory (active + provisioned/idle): **$0.007 / GB-hr**
- **Does NOT scale to zero** — you pay provisioned memory at idle; 1-min minimum vCPU charge
- Free tier: **none**

### AWS EC2 on-demand (Linux) — [source](https://aws.amazon.com/ec2/pricing/on-demand/)
- t3.micro **$0.0104/hr** · t3.small **$0.0208/hr** · t3.medium **$0.0416/hr**
- t4g.small (arm) **$0.0168/hr** · t4g.medium (arm) **$0.0336/hr**
- EBS gp3: **$0.08 / GB-month** (3,000 IOPS + 125 MB/s baseline included)
- Free tier: legacy 750 hrs t2/t3.micro 12-mo (pre-2025-07-15 accounts only); new accounts → credits

---

## Hosting / edge / DNS

### AWS Amplify Hosting — [source](https://aws.amazon.com/amplify/pricing/)
- Free tier (**12 months**): 1,000 build-min, 5 GB stored, 15 GB served, 500,000 SSR requests, 100 GB-hrs SSR compute
- Build: **$0.01 / min** · Storage: **$0.023 / GB-mo** · Served: **$0.15 / GB**
- SSR requests: **$0.30 / 1M** · SSR compute: **$0.20 / GB-hr**
- Supports Next.js SSR (App Router) + static; SSR billed on the two SSR lines above

### Amazon CloudFront — [source](https://aws.amazon.com/cloudfront/pricing/)
- Free: **1 TB out/mo + 10M requests/mo — always-free**
- Data out (US, first tier): **$0.085 / GB** · HTTPS requests: **$0.01 / 10,000**

### Amazon S3 Standard — [source](https://aws.amazon.com/s3/pricing/)
- Storage: **$0.023 / GB-mo** · PUT: **$0.005 / 1,000** · GET: **$0.0004 / 1,000**
- Free tier: now credit-model (classic 5 GB fixed allowance no longer published)

### Amazon Route 53 — [source](https://aws.amazon.com/route53/pricing/)
- Hosted zone: **$0.50 / zone / mo** (first 25) · Queries: **$0.40 / 1M** · Domain reg: separate, per-TLD

### ACM — [source](https://aws.amazon.com/certificate-manager/pricing/)
- Public certs for integrated services (CloudFront/Amplify/ALB/API GW): **free**

---

## Serverless glue

| Service | Rate | Free tier | Source |
|---|---|---|---|
| SQS (standard) | $0.40 / 1M req | 1M/mo always-free | [link](https://aws.amazon.com/sqs/pricing/) |
| DynamoDB on-demand | Write $0.625/1M, Read $0.125/1M, storage $0.25/GB-mo | 25 GB always-free | [link](https://aws.amazon.com/dynamodb/pricing/on-demand/) |
| EventBridge | $1.00 / 1M events; Scheduler $1.00/1M | Scheduler 14M/mo free | [link](https://aws.amazon.com/eventbridge/pricing/) |
| CodeBuild | general1.small $0.005/min; Lambda-compute ~$0.0006/min *(flagged, re-verify)* | 100 min/mo always-free | [link](https://aws.amazon.com/codebuild/pricing/) |
| API Gateway WebSocket | $1.00/1M messages + $0.25/1M conn-minutes | 1M msg + 750k conn-min, **12-mo only** | [link](https://aws.amazon.com/api-gateway/pricing/) |
| API Gateway HTTP | $1.00/1M req | 1M/mo **12-mo only** | [link](https://aws.amazon.com/api-gateway/pricing/) |
| Secrets Manager | $0.40/secret/mo + $0.05/10k calls | 30-day trial *(flagged)* | [link](https://aws.amazon.com/secrets-manager/pricing/) |
| Parameter Store | Standard: **free**; Advanced: $0.05/param/mo | standard free | [link](https://aws.amazon.com/systems-manager/pricing/) |
| CloudWatch Logs | Ingest $0.50/GB (IA $0.25/GB), storage $0.03/GB-mo | 5 GB always-free | [link](https://aws.amazon.com/cloudwatch/pricing/) |

---

## Neon (serverless Postgres) — [pricing](https://neon.com/pricing) · [free-plan quotas](https://neon.com/faqs/free-plan-limits-and-quotas)
- **Free plan:** 0.5 GB storage/project, **100 CU-hours/project/month** (~400 hrs at 0.25 CU — *not* always-on),
  autosuspend after **5 min** idle (can't disable), up to 2 CU, 100 projects, 10 branches/project
- **Connection pooling:** PgBouncer, up to 10,000 pooled connections — **use the `-pooler` endpoint from Lambda**
- **Serverless driver:** `@neondatabase/serverless` (HTTP/WebSocket) for serverless/edge
- **Launch plan (next tier):** usage-based, **$5/mo minimum**; storage ~$0.35/GB-mo, compute $0.106/CU-hr

---

## Items flagged for re-verification before relying on them
1. DynamoDB 25 GB "always-free" label — implied, not verbatim on current page.
2. CodeBuild arm1.small and Lambda-compute exact per-minute rates.
3. Secrets Manager 30-day trial — page now foregrounds the $200 credit model.
4. S3 fixed free allowances — no longer published; assume credit-model.
5. Amplify "12 months free" — verify against your specific account's Free Tier status.
