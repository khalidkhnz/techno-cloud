# Techno-Deployer — Architecture & Build Plan

An internal, self-hosted PaaS ("Vercel for us") that connects any repo and deploys it to multiple
AWS runtime targets. **Serverless-first** and designed to run inside AWS always-free tiers so the
platform itself is near-zero cost. Internal tool only — not a public SaaS.

See `PRICING_REFERENCE.md` for verified rates and `COST_BREAKDOWN.md` for cost modelling.

---

## 1. Locked Decisions

| Decision | Choice |
|---|---|
| Cloud scope | **AWS only** |
| Git sources | **GitHub, GitLab, Bitbucket, Zip upload** |
| Build language | **TypeScript full-stack** |
| Scale target | Org-wide, but **cost-optimized: serverless-first, scale-to-zero** |
| Frontend hosting | **AWS Amplify Hosting** (Next.js SSR/static) |
| Backend (control plane) | **NestJS on AWS Lambda** (arm64) + **Lambda Function URL** |
| Async workers | **Lambda triggered by SQS** |
| Long-running ops (Pulumi `up`, image builds) | **AWS CodeBuild** (triggered by deploy Lambda) |
| Scheduled jobs (reaper, cost snapshots, drift) | **EventBridge Scheduler → Lambda** |
| Provisioning | **Pulumi (Automation API, TS)**, run inside CodeBuild |
| Pulumi state | **Self-managed S3 backend + DynamoDB lock** |
| Database | **Neon serverless Postgres** (pooled endpoint) |
| Stack locks / ephemeral state | **DynamoDB** |
| ORM | **Drizzle** |
| Build strategy | **Dockerfile-first, Nixpacks fallback** (container targets); Amplify-managed build (web targets) |
| Registry / artifacts | **ECR** (images), **S3** (zips, static, cache) |
| Secrets | **SSM Parameter Store (standard, free)**; Secrets Manager only where rotation needed |
| Auth | **Better Auth** (email/password + OTP), **Nodemailer**, **invite-only** |
| Live logs (MVP) | **Polling CloudWatch Logs**; WebSocket upgrade in Phase 3 |
| Deploy targets | **Lambda, Amplify, Static/CDN, App Runner, ECS Fargate, EC2** (all toggleable) |

---

## 2. Tech Stack

**Frontend** — Next.js (App Router) + React + TS, shadcn/ui + Tailwind, hosted on **AWS Amplify**.

**Control plane / API** — NestJS (Node 22, **arm64**) packaged for **Lambda** (serverless-express
adapter) behind a **Lambda Function URL**. Drizzle ORM → **Neon Postgres** (pooled). Job queue =
**SQS**; workers = **Lambda**. Locks/ephemeral = **DynamoDB**. Auth = **Better Auth** (email/password
+ OTP) + **Nodemailer** (SES).

**Infra engine** — **Pulumi Automation API (TS)**; state in **self-managed S3 + DynamoDB lock**.
`pulumi up`/`destroy` execute inside a **CodeBuild** job (dodges Lambda's 15-min limit). One stack
per `project × environment`.

**Build farm** — **CodeBuild** (isolated, pay-per-minute, 100 min/mo always-free). Dockerfile-first,
Nixpacks fallback. Web targets (Amplify) use Amplify's managed CI instead.

**AWS services** — Lambda, SQS, DynamoDB, EventBridge Scheduler, CodeBuild, ECR, S3, CloudWatch Logs,
Parameter Store, ACM, Route 53, CloudFront, Amplify, App Runner, ECS Fargate, EC2.

**Platform's own footprint (near-free):** frontend on Amplify; API/workers on Lambda; DB on Neon; no
always-on servers, no NAT Gateway, no ALB, no RDS, no Redis.

---

## 3. Monorepo Layout (Turborepo + pnpm)

```
techno-deployer/
├── apps/
│   ├── web/                 # Next.js dashboard (Amplify-hosted)
│   └── api/                 # NestJS — Lambda handler + SQS worker handlers
├── packages/
│   ├── db/                  # Drizzle schema, migrations, Neon client (pooled)
│   ├── core/                # domain types, DeployTarget/SourceProvider interfaces, flags, cost types
│   ├── targets/             # drivers: lambda, amplify, static-cdn, apprunner, ecs-fargate, ec2
│   ├── providers/           # git: github, gitlab, bitbucket, zip
│   ├── pulumi/              # reusable Pulumi ComponentResources
│   ├── costs/               # cost estimation + free-tier meters + reconciliation (Costs Module)
│   └── ui/                  # shared shadcn components
├── infra/                   # Pulumi stacks for the platform itself
├── PLAN.md · PRICING_REFERENCE.md · COST_BREAKDOWN.md · COSTS_MODULE.md
├── PHASE1_TODO.md … PHASE4_TODO.md
```

---

## 4. Core Abstractions

Two pluggable interfaces keep new runtimes/sources additive — no core rewrites.

### DeployTarget (one per runtime)
```ts
interface DeployTarget {
  readonly kind: 'lambda' | 'amplify' | 'static-cdn' | 'apprunner' | 'ecs-fargate' | 'ec2';
  readonly artifactType: 'image' | 'zip' | 'static' | 'repo'; // 'repo' = Amplify managed build

  deploy(ctx: DeployContext): Promise<DeployResult>;   // Pulumi up() (in CodeBuild)
  getStatus(id: string): Promise<DeploymentStatus>;
  streamLogs(id: string): AsyncIterable<LogLine>;
  rollback(toDeploymentId: string): Promise<void>;
  destroy(id: string): Promise<void>;
  estimateCost(config: TargetConfig): CostEstimate;    // feeds the Costs Module
}
```

### SourceProvider (one per git source)
```ts
interface SourceProvider {
  readonly kind: 'github' | 'gitlab' | 'bitbucket' | 'zip';
  registerWebhook(project: Project): Promise<void>;
  fetchSource(ref: SourceRef): Promise<SourceBundle>;  // clone/unzip → S3
  reportStatus(commit: string, state: CommitState): Promise<void>;
}
```

---

## 5. End-to-End Deploy Flow (serverless)

```
Push / Webhook / Zip upload
   → [Lambda API] creates Deployment(status=queued) in Neon
   → [SQS build queue]
   → [Build Worker Lambda] enqueues a CodeBuild job
        CodeBuild: fetchSource → detect (Dockerfile? else Nixpacks) → build → push ECR (or static → S3)
        logs → CloudWatch  (UI polls; WebSocket later)
   → [SQS deploy queue]
   → [Deploy Worker Lambda] enqueues a CodeBuild job that runs Pulumi
        CodeBuild: DeployTarget.deploy() → pulumi up (S3 state, DynamoDB lock)
   → [Routing] subdomain / custom domain / preview URL + ACM TLS
   → Deployment = READY → notify + commit status
```

**Why CodeBuild for Pulumi/builds:** Lambda caps at 15 min; `pulumi up` and image builds can exceed
that. CodeBuild is serverless, pay-per-second, up to 8 h, 100 min/mo free. Deploy/build Lambdas stay
thin — they just trigger and track CodeBuild.

**Concurrency:** a **DynamoDB conditional-write lock** keyed `project:env` serializes Pulumi runs on a
stack (replaces the Redis lock from the always-on design).

---

## 6. Deploy Targets

| Target | Artifact | Build path | Provisions (Pulumi) | Best for | Scale-to-zero | Cost profile |
|---|---|---|---|---|---|---|
| **Lambda** | image/zip | CodeBuild | Lambda + Function URL / API GW | APIs, serverless apps (default) | ✅ | Near-free (1M req free) |
| **Amplify** | repo | Amplify managed CI | Amplify app + branch + domain | Next.js SSR / React / static web | ✅ (static) | 12-mo free, then ~cents |
| **Static / CDN** | static | CodeBuild/Amplify | S3 + CloudFront + OAC | Pure static / SPA | ✅ | CloudFront 1 TB free |
| **App Runner** | image | CodeBuild | App Runner service | Simple always-on container | ❌ | Pays idle memory |
| **ECS Fargate** | image | CodeBuild | ECS service, ALB TG, autoscale | Long-running containers | ❌ | ~$14+/app always-on (arm64) |
| **EC2** | image/AMI | CodeBuild | ASG + Launch Template + ALB | GPU / licensed / full control | ❌ | Always-on instance |

**Defaults for cost:** framework detection recommends **Lambda** (APIs) or **Amplify/Static** (web).
Fargate/EC2 are **opt-in** for genuine long-running/special workloads. Amplify is the recommended
target for Next.js and other SSR/static frontends since AWS handles build + host + CDN + TLS.

---

## 7. Networking & Routing (all toggleable)

Central `PlatformConfig` (DB-backed, admin-editable) + per-project overrides. Drivers check flags
before provisioning, so you only pay for what's on.

| Feature | Flag | Cost when off |
|---|---|---|
| Auto subdomain | `subdomains.enabled` | No Route53 records |
| Custom domains + TLS | `customDomains.enabled` | No ACM/validation (ACM is free anyway) |
| Preview/branch URLs | `previews.enabled` | Production-only, no ephemeral stacks |
| Static+CDN | `staticCdn.enabled` | No CloudFront distributions |
| Fargate/EC2 targets | `targets.ecsFargate` / `targets.ec2` | Serverless-only, zero always-on cost |

Serverless targets (Lambda/Amplify/Static) need **no ALB and no NAT Gateway** — the two biggest
always-on costs in the original design are eliminated. Route 53 hosted zone ($0.50/mo) + ACM (free)
cover custom domains/subdomains.

---

## 8. Auth, Teams & RBAC

- Better Auth: email/password + **OTP plugin**, delivered via **Nodemailer** (SES prod).
- **Invite-only**: admin invite → email link → OTP-verified signup.
- RBAC: `Owner / Admin / Developer / Viewer`, scoped **Team → Project**.
- Full **audit log** (deploys, config/flag changes, secret access).

---

## 9. Secrets & Env Vars

- Per-project, per-environment (production / preview / development) scoping.
- **Default store: SSM Parameter Store (standard = free)**; Secrets Manager only where rotation is
  required (it costs $0.40/secret/mo).
- Encrypted at rest; injected into Lambda/Amplify/task env at deploy; never rendered back; audited.

---

## 10. Data Model (core tables — Neon Postgres)

```
User, Team, TeamMembership, Invite
Project        (source config, target kind, per-project flags)
Environment    (production | preview | branch)
Deployment     (commit, status, buildId, targetRef, url, cost)
Domain         (custom domains, verification, cert status)
EnvVar / Secret (scoped; Parameter Store refs)
BuildLog, AuditLog
PlatformConfig (global feature flags & limits)
UsageRecord, CostSnapshot, FreeTierMeter, Budget   (Costs Module — see COSTS_MODULE.md)
```
DynamoDB holds only **ephemeral/hot state**: stack locks, idempotency keys, log-tail cursors.

---

## 11. Observability

- Build/runtime logs: CodeBuild + app log groups → CloudWatch → API polls → UI (WebSocket in Phase 3).
- Deployment status timeline in UI.
- **Costs Module** (`packages/costs`): live `estimateCost()` + free-tier meters + reconciled actuals
  from Cost Explorer. See `COSTS_MODULE.md`.

---

## 12. Phased Roadmap

- **Phase 1 — MVP slice:** GitHub + Zip → CodeBuild build → **Lambda** deploy + **Amplify** deploy →
  subdomain URL → polled logs. Better Auth invite+OTP. Pulumi-in-CodeBuild wired. → `PHASE1_TODO.md`
- **Phase 2 — Breadth + Costs:** GitLab + Bitbucket, Static/CDN + App Runner + Fargate drivers,
  framework detection, env/secrets, rollback, **Costs Module v1 (estimates + free-tier meters)**. → `PHASE2_TODO.md`
- **Phase 3 — Org-scale:** preview URLs + reaper, custom domains + ACM, RBAC/teams, audit logs,
  WebSocket logs, **Costs Module v2 (reconciled actuals + budgets)**. → `PHASE3_TODO.md`
- **Phase 4 — Hardening:** HA/idempotency, quotas, EC2 driver, drift detection, DR, security. → `PHASE4_TODO.md`

---

## 13. Top Risks

1. **Neon free-plan limits** — 0.5 GB storage + 100 CU-hrs/project/mo. A busy control-plane DB can
   exceed this → Launch plan ($5/mo min). Use pooled endpoint from Lambda; monitor via Costs Module.
2. **Lambda cold starts** — acceptable for internal use; arm64 + small bundle + esbuild. Avoid paid
   provisioned concurrency unless latency demands it.
3. **Pulumi state at scale** — S3 backend + DynamoDB lock; one stack per project-env; DynamoDB lock around `up`.
4. **Untrusted build code** — CodeBuild isolation is the security boundary; never build in shared long-lived compute.
5. **Amplify is 12-month free, not always-free** — fine (pennies after), but note it in cost tracking.
6. **New-account Free Plan restricts some services** — may need the **Paid Plan** (keeps the $200 credits)
   for unrestricted access to all always-free services.

---

## 14. Conventions

- pnpm workspaces + Turborepo; strict TS; shared types from `packages/core`.
- Every deploy target and source provider implements its interface — no core changes to add one.
- All AWS mutations go through Pulumi (no ad-hoc SDK provisioning) except read-only status/logs.
- Feature flags checked in drivers, not just UI. Prefer arm64 + serverless + free-tier services by default.
