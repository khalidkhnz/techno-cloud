# Techno-Deployer — Cost Breakdown

Cost to run the **serverless-first** platform, plus per-deployed-app cost. Every rate here traces to
`PRICING_REFERENCE.md` (verified against official pricing pages, us-east-1, **as of 2026-07-04**).
Rates are facts; the totals below are **estimates** derived from stated usage assumptions.

> **Method:** us-east-1, on-demand, arm64 where available. "Always-free" = recurring monthly AWS
> allowance that survives the 2025 Free Tier change. Validate with [calculator.aws](https://calculator.aws)
> before committing budget. 730 = hours/month.

---

## 1. TL;DR

| Scenario | Est. monthly cost |
|---|---|
| **Platform idle / very low use** (serverless, within free tiers) | **≈ $1–6** |
| **Small internal use** (~10 low-traffic apps on Lambda/Amplify) | **≈ $6–25** |
| **Active org-wide** (~50 apps, mixed, some always-on) | **≈ $120–400** |
| **Heavy** (~100 apps incl. many always-on Fargate) | **≈ $500–1,500** |

The platform is **near-free when apps use serverless targets** (Lambda/Amplify/Static). Cost rises
only when you opt apps into **always-on** targets (Fargate/EC2/App Runner) or exceed free tiers.

---

## 2. Platform baseline (the tool itself, serverless)

What it costs to run Techno-Deployer with **no user apps deployed**. Contrast with the old always-on
design (~$260–390/mo) — serverless removes NAT Gateway, ALB, RDS, ECS, and Redis entirely.

| Service | Role | Assumption | Free tier covers? | Est. / mo |
|---|---|---|---|---|
| **Amplify Hosting** | Frontend dashboard | low traffic, few builds | 12-mo free; then pennies | $0 (yr 1) → ~$1 |
| **Lambda (arm64)** | NestJS API + workers | < 1M req, < 400k GB-s | ✅ always-free | $0 |
| **SQS** | Job queues | < 1M req | ✅ always-free | $0 |
| **DynamoDB** | Locks, ephemeral state | < 25 GB, low ops | ✅ always-free | $0 |
| **EventBridge Scheduler** | Cron (reaper, snapshots) | < 14M invocations | ✅ always-free | $0 |
| **CodeBuild** | Builds + Pulumi runs | > 100 min/mo typical | 100 min free, then $0.005/min | $2–10 |
| **CloudWatch Logs** | Logs | ~few GB | 5 GB always-free | $0–3 |
| **Parameter Store** | Secrets/env (standard) | standard params | ✅ free | $0 |
| **ECR** | Platform images | ~1–5 GB | $0.10/GB-mo | $0–1 |
| **S3** | Pulumi state, artifacts | few GB | $0.023/GB-mo | $0–1 |
| **Route 53** | DNS / subdomains | 1 hosted zone | not free | $0.50 |
| **ACM** | TLS | certs | ✅ free | $0 |
| **Neon Postgres** | Database | ⚠️ may exceed free plan | 0.5 GB + 100 CU-hr free | $0 or $5 (Launch) |
| | | | **Baseline total** | **≈ $1–6 (yr 1) / $3–12 (after)** |

**The two variables that decide "free vs a few dollars":**
1. **CodeBuild minutes** — past 100 free min/mo you pay $0.005/min (~$0.025 per 5-min build).
2. **Neon** — a constantly-active control-plane DB can burn the 100 CU-hr/mo free budget; if so,
   Launch is **$5/mo minimum**. Autosuspend (5-min idle) helps a low-use internal tool stay free.

---

## 3. Build cost (CodeBuild)

Charged per build-minute; only while building. general1.small = **$0.005/min**; first **100 min/mo free**.

| Activity | Build-min/mo | Cost |
|---|---|---|
| 10 apps × 20 deploys × 5 min | 1,000 (−100 free) | ~$4.50 |
| 50 apps × 30 deploys × 5 min | 7,500 (−100) | ~$37 |
| 100 apps × 40 deploys × 5 min | 20,000 (−100) | ~$100 |

Layer/dependency caching (ECR/S3) shortens builds and lowers this. Note Pulumi `up` also runs in
CodeBuild — budget a couple extra minutes per deploy.

---

## 4. Per-app cost by deploy target

Cost of **one deployed app** for a month. This is the core of cost control — match target to workload.

| Target | Assumption | Est. / app / mo | Notes |
|---|---|---|---|
| **Lambda (arm64)** | 1M req, 512 MB, 200 ms | **$0 → ~$2** | Within always-free at low traffic; $0.20/1M + $0.0000133/GB-s after |
| **Static / CDN** | S3 + CloudFront, < 1 TB out | **$0 → ~$1** | CloudFront 1 TB + 10M req always-free |
| **Amplify** | SSR Next.js, low traffic | **$0 (yr 1) → ~$1–5** | 12-mo free (1k build-min, 15 GB served, 500k SSR req, 100 GB-hr) |
| **App Runner** | 1 vCPU / 2 GB, min 1 | **~$25–35** | No scale-to-zero; pays idle memory ($0.007/GB-hr) + active vCPU ($0.064/hr) |
| **ECS Fargate (arm64, 1 task)** | 0.25 vCPU / 0.5 GB, 24/7 | **~$7.20** | 0.25×730×0.03238 + 0.5×730×0.003559; + logs |
| **ECS Fargate (arm64, 0.5/1, 1 task)** | 0.5 vCPU / 1 GB, 24/7 | **~$14.40** | Typical small service |
| **ECS Fargate (HA, 2×0.5/1)** | 2 tasks | **~$29** | Production always-on web service |
| **EC2 (t4g.small, 1 inst)** | arm, 24/7 + 20 GB gp3 | **~$13.85** | $0.0168×730 + $1.60 EBS; + ALB if used |
| **EC2 (t4g.medium)** | arm, 24/7 + 20 GB | **~$26** | Bigger always-on |
| **EC2 GPU (g4dn.xlarge)** | 24/7 | **~$380+** | ML/GPU only |

**Fargate/EC2 arm64 (Graviton) is ~20% cheaper than x86** and is the default for container targets.
**Fargate Spot** cuts up to 70% for previews/non-critical.

**Preview deployments:** each live preview ≈ a Lambda/Amplify deploy (near-free) or a prorated
Fargate task. With Lambda/static previews + a TTL reaper, 20 previews cost **~$0–3/mo total**.

---

## 5. Scaling scenarios (all-in monthly)

Assumes **serverless-first mix**: 70% Lambda/Amplify/Static (scale-to-zero), 30% always-on Fargate.

| Scenario | Platform baseline | App compute | Builds | DNS/misc | **Total / mo** |
|---|---|---|---|---|---|
| **Idle** | $1–6 | $0 | $0 | $0.50 | **≈ $1–6** |
| **Small — 10 apps** (mostly serverless) | $1–6 | ~$15 | $4.50 | $2 | **≈ $22–28** |
| **Medium — 50 apps** (15 always-on Fargate) | $3–12 | ~$220 | $37 | $10 | **≈ $270–280** |
| **Large — 100 apps** (30 always-on Fargate) | $3–12 | ~$450 | $100 | $20 | **≈ $580–590** |
| **Large, all-serverless — 100 apps** | $3–12 | ~$50 | $100 | $20 | **≈ $170–180** |

The delta between the last two rows (~$580 vs ~$180) is entirely **always-on vs scale-to-zero
targets** — the single biggest lever. Routing apps to Lambda/Amplify instead of Fargate roughly
**3× cheaper** at 100 apps.

---

## 6. Cost-control levers (mapped to feature flags)

| Lever | Saving | How |
|---|---|---|
| **Default to serverless targets** | Up to ~$14/app | Lambda/Amplify/Static scale to zero; Fargate/EC2 opt-in |
| **arm64 everywhere** | ~20% compute | Lambda, Fargate, EC2 (Graviton) |
| **Fargate Spot** | up to 70% | Previews / non-critical always-on |
| **Parameter Store over Secrets Manager** | $0.40/secret/mo | Standard params are free |
| **No ALB / no NAT** | ~$70+/mo | Serverless targets need neither |
| **CloudWatch retention** | $/GB | Short retention + IA log class ($0.25/GB) |
| **Preview TTL + reaper** | prevents sprawl | Auto-destroy idle previews |
| **CodeBuild caching** | build-minutes | ECR layer / S3 dependency cache |
| **Neon autosuspend** | keeps DB free | 5-min idle suspend on Free plan |
| **Disable unused features** | varies | Flags gate all provisioning |

---

## 7. Bottom line

- **Platform overhead (no apps):** **≈ $1–6/mo** year 1 (Amplify free), **≈ $3–12/mo** after — driven
  mostly by CodeBuild minutes and whether Neon stays under its free plan.
- **Marginal cost of one more app:** **$0–2** (Lambda/Static/Amplify) up to **$14–30** (Fargate/EC2).
- **"Almost free" is real** for a low-traffic internal tool on serverless targets — realistically
  **single-digit dollars/month**.
- It stops being free when you: exceed **CodeBuild** 100 free min, exceed **Neon** free plan, or opt
  apps into **always-on** Fargate/EC2/App Runner.

### Honest caveats
1. **Amplify is 12-month free, not always-free** — after year 1, expect ~$1–5/mo for the frontend.
2. **Neon free = 0.5 GB + 100 CU-hr/project/mo** — a busy DB needs Launch (**$5/mo min**).
3. **New AWS accounts (post 2025-07-15)** get **$200 credits + always-free services**, but the Free
   Plan restricts some services and **expires in 6 months**; choose the **Paid Plan** (same credits)
   for unrestricted always-free access long-term.
4. **API Gateway WebSocket free tier is 12-month only** — the MVP polls logs to avoid this; WebSocket
   logs (Phase 3) add ~$1/1M messages after year 1.
5. These totals are **estimates over stated assumptions** — real cost depends on traffic, request
   volume, build frequency, and data transfer. Tag resources by `project/team/env` so the **Costs
   Module** reports actuals (see `COSTS_MODULE.md`).

---

*All underlying rates and sources: see `PRICING_REFERENCE.md`.*
