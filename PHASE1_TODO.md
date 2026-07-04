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
- [ ] Init Turborepo + pnpm workspace; strict `tsconfig` base
- [ ] Layout: `apps/{web,api}`, `packages/{db,core,targets,providers,pulumi,costs,ui}`
- [ ] Shared ESLint/Prettier; commit hooks
- [ ] `.env` schema + validation (zod) in `packages/core`
- [ ] Local dev: Neon dev branch + LocalStack (or real AWS sandbox) for SQS/DynamoDB/S3

## 1. Core Types (`packages/core`)
- [ ] `DeployTarget` (kinds incl. `lambda`, `amplify`), `SourceProvider`, `DeployContext`, `DeployResult`, `DeploymentStatus`, `LogLine`
- [ ] `PlatformConfig` / feature-flag schema (serverless targets ON, Fargate/EC2 OFF by default)
- [ ] Driver registries: `kind → DeployTarget`, `kind → SourceProvider`
- [ ] `CostEstimate` type (for Costs Module hook, even if v1 lands in Phase 2)

## 2. Database (`packages/db`, Drizzle + Neon Postgres)
- [ ] Connect via Neon **pooled endpoint** (`-pooler`) using `@neondatabase/serverless`
- [ ] Schema: `User, Team, TeamMembership, Invite, Project, Environment, Deployment, BuildLog, PlatformConfig`
- [ ] Migrations + seed (one admin, default PlatformConfig)
- [ ] Verify connection pooling works from Lambda (no connection exhaustion)

## 3. Auth (Better Auth + Nodemailer)
- [ ] Better Auth in `apps/api` (email/password + OTP plugin)
- [ ] Nodemailer transport (SMTP dev, SES-ready)
- [ ] Invite flow: admin invite → email link → signup → OTP verify
- [ ] Session middleware + guards; enforce Admin for invites
- [ ] RBAC enum stub (Owner/Admin/Developer/Viewer)

## 4. Control Plane API (`apps/api`, NestJS on Lambda)
- [ ] Bootstrap NestJS; package for **Lambda arm64** (serverless-express adapter) behind **Function URL**
- [ ] Config + Drizzle modules
- [ ] **SQS** queues (`build`, `deploy`) + worker Lambda handlers
- [ ] Modules: `auth`, `projects`, `deployments`, `webhooks`, `logs`
- [ ] Endpoints: create/list project, trigger deploy, get deployment, **poll logs**
- [ ] **DynamoDB stack-lock** helper (`project:env`) via conditional writes

## 5. Source Providers (Phase 1 subset)
- [ ] `github`: GitHub App (webhook + clone via installation token), commit status
- [ ] `zip`: signed S3 upload → unzip → SourceBundle
- [ ] `fetchSource()` writes normalized bundle to S3

## 6. Build Pipeline (CodeBuild)
- [ ] Provision reusable CodeBuild project (Pulumi) with ECR push perms, arm compute
- [ ] Build detector: Dockerfile present? use it : generate via **Nixpacks**
- [ ] Build worker Lambda triggers CodeBuild; tracks status
- [ ] Stream CodeBuild/CloudWatch logs → `BuildLog` + expose via polling endpoint
- [ ] Handle build failures cleanly

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
- [ ] Auth pages: login (password + OTP), accept-invite, logout
- [ ] Projects list + create (connect GitHub repo / upload zip)
- [ ] Project detail: target picker (Lambda / Amplify), Deploy button
- [ ] Deployment detail: status timeline + **polled log stream**
- [ ] Admin: invite user
- [ ] Deploy `apps/web` itself to Amplify (dogfood)

## 10. Platform Infra (`infra/`, dogfood — all serverless)
- [ ] Pulumi stack: S3 (state, artifacts), DynamoDB (locks), SQS queues, ECR, Route 53 zone, ACM cert
- [ ] Deploy `apps/api` + workers as **Lambda** functions (Function URL + SQS triggers)
- [ ] Neon project + pooled connection string in Parameter Store
- [ ] IAM roles (least-privilege: CodeBuild, deploy/build Lambdas, Pulumi)
- [ ] Confirm: no NAT Gateway, no ALB, no RDS, no Redis, no always-on compute

## 11. Verify
- [ ] E2E manual test hits full exit-criteria path for **both** Lambda and Amplify targets
- [ ] Failure paths: bad build, failed deploy, revoked invite
- [ ] Confirm free-tier usage (check Lambda/SQS/DynamoDB/CodeBuild meters near zero)
- [ ] Document local + prod run steps in README
