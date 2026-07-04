# Phase 1 — MVP Vertical Slice (serverless)

**Goal:** Prove the full loop end-to-end on serverless infra: an invited user logs in via OTP,
connects a GitHub repo (or uploads a zip), and deploys it to **Lambda** OR **Amplify**, reaching a
live subdomain URL with build logs — all provisioned by Pulumi running in CodeBuild. No always-on
servers anywhere.

Ship two targets that cover the two common shapes: **Lambda** (API/serverless) and **Amplify**
(Next.js/web). Breadth comes in Phase 2.

**Exit criteria:** Invited user → OTP login → connect GitHub repo (or zip) → pick Lambda or Amplify →
Deploy → running app at `https://<app>.deploy.internal` with streaming (polled) logs. Everything runs
within free tiers except trivial Route 53 / CodeBuild overage.

---

## 0. Repo & Tooling
- [x] Init Turborepo + pnpm workspace; strict `tsconfig` base
- [x] Layout: `apps/{web,api}`, `packages/{core,env,db,costs,targets,providers,pulumi,ui}`, `infra`
- [ ] Shared ESLint/Prettier; commit hooks _(prettier dep added; config + hooks pending)_
- [x] Validated env vars via **T3 Env** — `@t3-oss/env-core` in `packages/env` (server), `@t3-oss/env-nextjs` in `apps/web`
- [ ] Local dev: Neon dev branch + LocalStack (or real AWS sandbox) for SQS/DynamoDB/S3

## 1. Core Types (`packages/core`)
- [x] `DeployTarget` (kinds incl. `lambda`, `amplify`), `SourceProvider`, `DeployContext`, `DeployResult`, `DeploymentStatus`, `LogLine`
- [x] `PlatformConfig` / feature-flag schema (serverless targets ON, Fargate/EC2 OFF by default)
- [x] Driver registries: `kind → DeployTarget`, `kind → SourceProvider`
- [x] `CostEstimate` type (for Costs Module hook, even if v1 lands in Phase 2)

## 2. Database (`packages/db`, Drizzle + Neon Postgres)
- [x] Connect via Neon **pooled endpoint** (`-pooler`) using `@neondatabase/serverless` (URL from validated env)
- [x] Schema: `User, Team, TeamMembership, Invite, Project, Environment, Deployment, AuditLog, PlatformConfig` (+ `FreeTierMeter` for Costs)
- [x] Migrations (0000–0003) + **seed** (default team + PlatformConfig + owner invite from `ADMIN_EMAIL`) — `db:seed`
- [ ] Verify connection pooling works from Lambda (no connection exhaustion)

## 3. Auth (Better Auth + Nodemailer)
- [x] Better Auth in `apps/api` (email/password + **emailOTP** plugin), Drizzle adapter, auth tables (migration 0001), handler mounted at `/api/auth/*` (raw-body before JSON parser)
- [x] Nodemailer transport (SMTP with dev-logging fallback, SES-ready)
- [~] Invite flow: admin invite endpoint + email link ✓, accept ✓, **invite-only enforced** via Better Auth `user.create.before` hook; signup/OTP via Better Auth endpoints _(UI pending)_
- [x] Session middleware + guards: `AuthGuard` (valid session) on projects/deployments/platform-config; `AdminGuard` (owner/admin role) on invites create/list + platform-config update; domain user + membership materialized on signup (`create.after`)
- [x] RBAC enum stub (Owner/Admin/Developer/Viewer) — `roleEnum` in schema + `core`

## 4. Control Plane API (`apps/api`, NestJS on Lambda)
- [x] Bootstrap NestJS + **Lambda arm64 handler** (serverless-express adapter, cached per container); health route _(Function URL wiring in §10)_
- [x] Config (T3 Env) + **Drizzle module** (global DI provider)
- [x] **SQS**: producer + **build/deploy worker Lambda handlers** ✓ (build→CodeBuild+state; deploy→driver under stack lock+state); queues §10 _(event-source mappings wired at deploy)_
- [~] Modules: `projects` ✓, `deployments` ✓, `platform-config` ✓, `invites` ✓, `auth` ✓, `webhooks` ✓, `env-vars`/`detect`/`estimates` ✓; remaining: `logs`
- [~] Endpoints: project CRUD ✓, platform config ✓, **create deployment (trigger)** ✓, list deployments ✓; remaining: poll logs
- [x] **DynamoDB stack-lock** helper (`project:env`) via conditional writes (`withLock` in `packages/aws`)

## 5. Source Providers (Phase 1 subset)
- [~] `github`: webhook parse + token clone URL ✓ (all 4 providers structured in `packages/providers`); GitHub App install + commit status pending
- [ ] `zip`: signed S3 upload → unzip → SourceBundle
- [ ] `fetchSource()` writes normalized bundle to S3 _(clone/unzip runs in CodeBuild)_

## 6. Build Pipeline (CodeBuild)
- [x] Provision reusable CodeBuild project (Pulumi, arm64, privileged for docker, ECR via role, CloudWatch logs) — `infra/build.ts`; StartBuild passes only PLAINTEXT env overrides (no source/buildspec override)
- [x] Build detector in buildspec: Dockerfile present → `docker build` : **Nixpacks**; push to ECR tagged by deploymentId; worker computes CLONE_URL + SOURCE_REF via the source provider
- [x] Build worker Lambda triggers CodeBuild; tracks status (saves buildId, sets building state)
- [ ] Stream CodeBuild/CloudWatch logs → `BuildLog` + expose via polling endpoint
- [~] Handle build failures cleanly _(worker marks `failed`; CodeBuild-completion → deploy bridge pending)_

## 7. Pulumi Engine (`packages/pulumi` + `packages/targets`)
- [ ] Automation API wrapper run **inside CodeBuild** (init workspace, select/create stack, up/destroy, outputs)
- [ ] Self-managed **S3 state backend + DynamoDB lock** (provisioned in `infra/`)
- [ ] Shared Route 53 zone + wildcard **ACM** cert (created once)
- [ ] **lambda** DeployTarget: Lambda (image/zip from ECR/S3) + Function URL + subdomain record
- [ ] **amplify** DeployTarget: Amplify app + branch connected to repo (Amplify managed build/host) + subdomain
- [ ] `deploy()` returns URL + status; `destroy()` tears down; `streamLogs()` from log group

## 8. Networking (Phase 1 minimum)
- [ ] Auto subdomain (`<app>.deploy.internal`) via Route 53
- [ ] Wildcard ACM cert on the base domain
- [ ] Flags: `lambda`, `amplify`, `subdomains` ON; Fargate/EC2/customDomains/previews OFF

## 9. Web UI (`apps/web`, Next.js on Amplify)
- [x] Typed API client (`lib/api.ts`) + CORS enabled on API
- [x] Auth pages: **login (OTP)**, **accept-invite**, **logout**, session guard on /projects (Better Auth client wrappers)
- [~] Projects list + create (GitHub repo + target picker; zip upload pending)
- [x] Project detail: target shown + **Deploy button**
- [~] Deployment list with **5s status polling** ✓; live log stream pending
- [x] Admin: invite user (page → POST /invites, emails accept link)
- [ ] Deploy `apps/web` itself to Amplify (dogfood)

## 10. Platform Infra (`infra/`, dogfood — all serverless)
- [x] Pulumi stack: S3 (state+artifacts, versioned/private), DynamoDB (locks + idempotency+TTL), SQS (build/deploy + DLQs), ECR (scan+lifecycle), Route 53 zone, ACM wildcard cert _(authored + typechecks; not yet `pulumi up`'d)_
- [ ] Deploy `apps/api` + workers as **Lambda** functions (Function URL + SQS triggers)
- [ ] Neon project + pooled connection string in Parameter Store
- [x] IAM roles: CodeBuild (PowerUser + boundary-enforced `${prefix}-app-*` role mgmt, denies priv-esc) + Lambda exec role (scoped SQS/DynamoDB/artifacts-only/SSM-path/StartBuild-project-ARN) _(deeper per-project STS AssumeRole split → PHASE4 §7)_
- [x] Confirm: no NAT Gateway, no ALB, no RDS, no Redis, no always-on compute

## 11. Verify
- [ ] E2E manual test hits full exit-criteria path for **both** Lambda and Amplify targets
- [ ] Failure paths: bad build, failed deploy, revoked invite
- [ ] Confirm free-tier usage (check Lambda/SQS/DynamoDB/CodeBuild meters near zero)
- [ ] Document local + prod run steps in README
