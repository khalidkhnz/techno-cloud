# Techno-Deployer

An internal, self-hosted PaaS — **"Vercel for us."** Connect any repo (GitHub, GitLab, Bitbucket, or a
zip upload) and deploy it to multiple AWS runtime targets. **Serverless-first**, designed to run inside
AWS always-free tiers so the platform itself stays near-zero cost. Internal tool — not a public SaaS.

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

- **Frontend:** Next.js (App Router) + shadcn/ui, hosted on **AWS Amplify**
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

## Getting started (local)

```bash
pnpm install
cp .env.example .env          # set DATABASE_URL (Neon pooled) + ADMIN_EMAIL
pnpm --filter @techno-deployer/db db:migrate   # apply migrations 0000–0003
ADMIN_EMAIL=you@company.com pnpm --filter @techno-deployer/db db:seed   # default team + owner invite
pnpm build && pnpm test       # 18 unit tests
pnpm --filter @techno-deployer/api dev         # API on :3001
pnpm --filter @techno-deployer/web dev         # dashboard on :3000
```

**Bootstrap:** the platform is invite-only. `db:seed` creates a default team + an **owner invite**
for `ADMIN_EMAIL`. Sign in at `/login` with that email — the OTP is emailed (logged to the API
console in dev when SMTP is unset). On first sign-in you become owner of the Default team and can
invite others from **Invite user**.

## Status

Phases 1–2 substantially implemented (control plane, auth + RBAC, deploy-loop plumbing, env/secrets,
rollback, cost estimation + free-tier meters, feature flags, providers/webhooks, environments).
Remaining work needing live AWS: real driver `deploy()` Pulumi programs, CodeBuild buildspec, the
build→deploy bridge, usage poller, alert scheduler, and log streaming.
