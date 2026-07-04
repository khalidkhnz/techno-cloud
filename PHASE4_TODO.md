# Phase 4 — Hardening & Scale

**Goal:** Make it production-grade for org-wide reliance without giving up the serverless cost model:
resilient/idempotent workers, quotas, the EC2 target, drift detection, DR, security hardening, and
**Costs Module v3** (anomaly detection + rightsizing). Nothing new to the user experience — this is
reliability, safety, and operating at 100s of apps.

**Exit criteria:** Workers are idempotent and self-healing, quotas throttle runaway usage, the EC2
target works, infra drift is detected and reconciled, a backup/restore path is tested, and the Costs
Module flags waste and suggests cheaper targets.

---

## 1. Resilience & Idempotency (serverless)
- [ ] Idempotent SQS worker handlers (dedupe via DynamoDB idempotency keys)
- [ ] Dead-letter queues for build/deploy; retry with backoff
- [ ] Lambda concurrency limits per queue; poison-message handling
- [ ] Graceful handling of CodeBuild timeouts/failures mid-Pulumi
- [ ] Neon connection resilience (pooler, retry, circuit-break)

## 2. Build Throughput
- [ ] CodeBuild concurrency management within `maxConcurrentBuilds`
- [ ] Fair scheduling across teams; queue backpressure
- [ ] Build cache (ECR layer / S3 dependency) to cut minutes + cost
- [ ] Per-team build concurrency limits

## 3. Quotas & Limits
- [ ] Enforce `maxAppsPerTeam`, max concurrent builds, max previews, resource ceilings
- [ ] Soft warnings + hard blocks in UI + API
- [ ] Admin override path (audited)
- [ ] Tie quotas to Costs Module budgets

## 4. EC2 Deploy Target
- [x] `ec2` DeployTarget: ASG + Launch Template (**arm/Graviton**, al2023 AMI) + user-data docker run + ECR read role _(ALB URL wiring deferred)_
- [ ] Special workloads (GPU instance types, licensed AMIs)
- [ ] Rolling deploy / instance refresh
- [ ] `estimateCost()` + flag wiring (cost-flagged as always-on)

## 5. Drift Detection & Reconciliation
- [ ] Scheduled `pulumi preview` per active stack (EventBridge → CodeBuild) to detect drift
- [ ] Surface drift in UI; one-click reconcile (`up`)
- [ ] Alert on unexpected drift (manual console changes)
- [ ] Orphan-resource sweeper (resources with no owning stack)

## 6. Disaster Recovery
- [ ] Neon backups / branch snapshots + tested restore runbook
- [ ] Pulumi S3 state versioning + backup; DynamoDB lock/idempotency table backup (PITR)
- [ ] Documented recovery: rebuild control plane (all Lambda/serverless) from IaC
- [ ] Periodic DR drill

## 7. Security Hardening
- [ ] Least-privilege IAM audit across CodeBuild, build/deploy Lambdas, Pulumi
- [ ] Secret rotation (Secrets Manager where required)
- [ ] Network review (VPC endpoints for S3/ECR/DynamoDB; SGs; private access)
- [ ] Dependency + image scanning in build pipeline
- [ ] Rate limiting + brute-force protection on auth (Function URL / WAF)

## 8. Observability & Ops
- [ ] Dashboards: build times, deploy success rate, queue depth, DLQ, error rates, cold-start latency
- [ ] Alerting on SLO breaches
- [ ] Structured logging + tracing across Lambdas/CodeBuild
- [ ] Runbooks for common failure modes

## 9. Costs Module v3 — see COSTS_MODULE.md
- [ ] Cost anomaly detection (sudden spend spikes)
- [ ] Rightsizing suggestions ("this Fargate app is idle 90% — move to Lambda, save ~$12/mo")
- [ ] Showback/chargeback per team
- [ ] Rate-card staleness job (flag rates older than 90 days for re-verification)

## 10. Verify
- [ ] Chaos: kill a worker mid-deploy → job recovers via DLQ/idempotency
- [ ] Quota enforcement negative tests
- [ ] Drift injected via console → detected + reconciled
- [ ] Full DR restore drill passes
- [ ] EC2 target deploys + rolling-updates a real app
