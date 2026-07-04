# Techno-Deployer

An internal, self-hosted PaaS — **"Vercel for us."** Connect any repo (GitHub, GitLab, Bitbucket, or a
zip upload) and deploy it to multiple AWS runtime targets. **Serverless-first**, designed to run inside
AWS always-free tiers so the platform itself stays near-zero cost. Internal tool — not a public SaaS.

## Overview

A push or PR (via signed webhook) or a manual **Deploy** click creates a `Deployment`, which flows
through a fully serverless pipeline:

```
webhook / dashboard → API (Lambda) → SQS build queue
  → build worker → CodeBuild (Dockerfile-first, else Nixpacks) → image → ECR
  → SQS deploy queue → deploy worker → CodeBuild runs Pulumi (per project:env stack, under a lock)
  → target provisioned (Lambda / Amplify / Static-CDN / App Runner / ECS / EC2)
  → live URL + status → dashboard (live-polled logs, rollback)
```

Everything is pluggable: adding a runtime = one `DeployTarget` driver; adding a git host = one
`SourceProvider`. Feature flags gate every target/route so you pay only for what's on. PR **previews**,
custom **domains**, per-project **env/secrets**, **cost** estimation + free-tier meters + Cost Explorer
reconciliation, **RBAC** (owner/admin/developer/viewer), and **audit logging** are all built in.

**Monorepo layout** (Turborepo + pnpm):

```
apps/        web (Next.js dashboard) · api (NestJS on Lambda + SQS/scheduled handlers)
packages/    core (interfaces/types) · db (Drizzle + Neon) · env (T3 Env) · aws (SDK clients)
             pulumi (Automation API + deploy programs) · targets (6 drivers) · providers (4 git)
             costs (estimators/meters/advice) · ui
infra/       Pulumi stack (all AWS infra incl. the platform's own compute)
```

## Deploy targets

| Target | Best for | Scale-to-zero |
|---|---|---|
| **Lambda** (arm64) | APIs / serverless apps (default) | ✅ |
| **AWS Amplify** | Next.js SSR / React / static web | ✅ (static) |
| **Static / CDN** (S3 + CloudFront) | SPAs / static sites | ✅ |
| **App Runner** | Simple always-on containers | ❌ |
| **ECS Fargate** | Long-running containers | ❌ |
| **EC2** | GPU / licensed / full control | ❌ |

## Tech stack

- **Frontend:** Next.js (App Router) + Tailwind CSS, hosted on **AWS Amplify**
- **API:** NestJS on **AWS Lambda** (arm64) + Function URL
- **Workers:** SQS → Lambda · **Crons:** EventBridge Scheduler
- **Builds & Pulumi runs:** AWS CodeBuild (Dockerfile-first, Nixpacks fallback)
- **Provisioning:** Pulumi (Automation API, TS) · state in self-managed S3 + DynamoDB lock
- **Database:** Neon serverless Postgres (pooled) + Drizzle ORM
- **Locks / ephemeral state:** DynamoDB · **Secrets:** SSM Parameter Store
- **Auth:** Better Auth (email/password + OTP) + Nodemailer, invite-only
- **Monorepo:** Turborepo + pnpm

## Documentation

| Doc | What's in it |
|---|---|
| [`PLAN.md`](./PLAN.md) | Full architecture, decisions, core abstractions, deploy flow |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | AWS bring-up runbook (state backend → `pulumi up` → migrate/seed) |
| [`PRICING_REFERENCE.md`](./PRICING_REFERENCE.md) | Verified AWS/Neon rates + sources (single source of truth) |
| [`COST_BREAKDOWN.md`](./COST_BREAKDOWN.md) | Platform + per-app cost modelling |
| [`COSTS_MODULE.md`](./COSTS_MODULE.md) | Cost/usage module design (estimates, free-tier meters, budgets) |
| [`PHASE1_TODO.md`](./PHASE1_TODO.md) | MVP slice: Lambda + Amplify deploy, invite/OTP auth |
| [`PHASE2_TODO.md`](./PHASE2_TODO.md) | Breadth: all sources/targets, env/secrets, rollback, Costs v1 |
| [`PHASE3_TODO.md`](./PHASE3_TODO.md) | Org-scale: previews, custom domains, RBAC, Costs v2 |
| [`PHASE4_TODO.md`](./PHASE4_TODO.md) | Hardening: resilience, quotas, EC2, drift, DR, Costs v3 |

## Cost at a glance

- **Platform idle:** ~$1–6/mo (year 1) — serverless, within free tiers
- **Small internal use (~10 serverless apps):** ~$22–28/mo
- **Marginal per app:** $0–2 (Lambda/Amplify/Static) → $14–30 (Fargate/EC2)

See [`COST_BREAKDOWN.md`](./COST_BREAKDOWN.md) for detail and caveats.

## Local Dev Guide

### Prerequisites

- **Node 22** (`.nvmrc` pins it — run `nvm use`), **pnpm 10**
- A **[Neon](https://neon.tech)** project — copy its **pooled** connection string (the `-pooler` host)
- No AWS needed for local dev: AWS SDK calls fail-soft, and unset SMTP logs OTP/emails to the console

### Setup

```bash
nvm use && pnpm install
cp .env.example .env            # set DATABASE_URL (Neon pooled) + ADMIN_EMAIL
pnpm --filter @techno-deployer/db db:migrate                 # apply migrations (0000–0009)
ADMIN_EMAIL=you@company.com pnpm --filter @techno-deployer/db db:seed   # default team + owner invite
```

### Run

```bash
pnpm --filter @techno-deployer/api dev     # API  → http://localhost:3001
pnpm --filter @techno-deployer/web dev     # dashboard → http://localhost:3000
```

Open `http://localhost:3000/login`, enter your `ADMIN_EMAIL`, and grab the OTP from the **API console**
(SMTP is unset in dev). On first sign-in you become **owner** of the Default team and can invite others.

> Deploys/builds and live logs need AWS (they run in CodeBuild/Lambda). Locally you can exercise the
> full control plane — auth, projects, env/secrets, environments, domains, teams, costs UI — end to end.

### Common commands

```bash
pnpm build         # turbo build (all packages + apps)
pnpm test          # vitest — 27 unit tests (detect, estimators, meters, providers, config, advice)
pnpm lint          # eslint (flat config) — 0 warnings enforced in CI
pnpm --filter @techno-deployer/infra typecheck    # typecheck the Pulumi stack
pnpm --filter @techno-deployer/db db:generate      # regenerate a migration after a schema change
pnpm --filter @techno-deployer/api bundle          # esbuild → dist-lambda (needed before pulumi up)
```

CI (`.github/workflows/ci.yml`) runs **lint → infra typecheck → build → test** on every push/PR.

### Notes

- **Env is validated** (T3 Env). Set `SKIP_ENV_VALIDATION=1` to bypass in CI-style builds.
- After editing `packages/db/src/schema.ts`, run `db:generate` then `db:migrate`.
- Editor may flag "cannot find module `@techno-deployer/*`" until `node_modules` is picked up — the
  CLI build is the source of truth.

## Status

**Frontend and backend are complete** — control plane, invite-only OTP auth + full RBAC, all six deploy
drivers (real Pulumi programs), build/deploy CodeBuild pipelines, env/secrets, rollback, environments,
PR previews, custom domains, notifications, cost estimation + free-tier meters + Cost Explorer
reconciliation + budgets + rightsizing, signed webhooks, drift detection, idempotent workers, audit
logging, live-polled logs (+ WebSocket backend), CI, and all infra (incl. the platform's own compute).

**Next step is AWS bring-up** — see [`DEPLOYMENT.md`](./DEPLOYMENT.md). What remains is AWS-runtime only:
end-to-end/matrix verification, observability dashboards, DR drills, orphan-resource sweeper.
