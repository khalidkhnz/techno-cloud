# Phase 2 — Breadth + Costs Module v1

**Goal:** Go from two targets to the full set, add all git sources, framework detection, env/secrets,
rollback — and ship **Costs Module v1** so the platform's "stay near-free" promise is observable from
day one. The pluggable interfaces from Phase 1 make each target/source additive.

**Exit criteria:** A project can be sourced from GitHub/GitLab/Bitbucket/zip, deployed to any of
Lambda / Amplify / Static-CDN / App Runner / ECS Fargate, with env/secrets injected and rollback,
and the Costs Module shows per-app estimates + free-tier meters with alerts.

---

## 1. Source Providers (complete the set)
- [~] `gitlab`: webhook parse + token clone URL (configurable self-hosted host) ✓; registerWebhook + commit-status API pending
- [~] `bitbucket`: webhook parse + token clone URL ✓; registerWebhook + build-status API pending
- [x] Provider-agnostic webhook router: `POST /webhooks/:provider` → **verify signature (fail-closed HMAC/token over raw body)** → parse → match by **provider + repo + ref** → enqueue deploy of the **exact commit**; per-provider creds still env-based (Parameter Store + rate-limit pending)

## 2. Framework Detection
- [x] Detector: inspect Dockerfile + `package.json`/framework signatures (`detectFramework` in `packages/core`)
- [x] Recommend default target: next→amplify, vite/CRA/static→static-cdn, express/fastify/nest→lambda, docker→lambda, fallback→lambda (+ buildStrategy dockerfile/nixpacks/static)
- [ ] Nixpacks build/start overrides in project settings
- [ ] Static-build path (framework `build` → output dir → S3)

## 3. Deploy Targets (add remaining drivers)
- [x] `static-cdn`: S3 (private) + CloudFront + OAC + bucket policy _(custom-domain wiring deferred)_
- [x] `apprunner`: App Runner service from ECR image + ECR access role (boundary-scoped)
- [x] `ecs-fargate`: **arm64** task def + service + ALB (default VPC) + exec role
- [x] Each implements the full interface incl. `estimateCost()`; `streamLogs()` pending _(needs AWS)_ — all six registered in `createTargetRegistry()`
- [~] Target picker shows **cost estimate per target** ✓ (via `/estimates`); recommended-default wiring (detection) pending

## 4. Environment & Secrets
- [x] `env_vars` table scoped by project + environment (scope enum prod/preview/dev); CRUD API under `/projects/:id/env`
- [x] Secrets → **SSM Parameter Store** SecureString (DB stores the param path); plain vars stored inline
- [ ] Inject into Lambda / Amplify / task env at deploy time _(needs driver `deploy()`)_
- [~] UI: add/remove ✓, secret values masked `***` and never returned; audit-on-access pending

## 5. Environments
- [x] `Environment` records per project — CRUD API `/projects/:id/environments` + UI (production protected from deletion; auto-created on first deploy)
- [~] Per-environment env vars (scope) ✓; per-environment target settings + full `DeployContext.environment` wiring pending

## 6. Rollback
- [x] Track immutable artifact per deployment (`imageUri` = ECR:`<deploymentId>`; `rolledBackFrom` link)
- [x] `rollback(toDeploymentId)` creates a new deployment reusing the prior artifact + enqueues a **deploy directly (no rebuild)** _(driver re-point lands with real `deploy()`)_
- [x] UI: deployment history + one-click "rollback to this" on ready deployments
- [x] Guard: only ready deployments; rejects failed/destroyed + missing-artifact

## 7. Costs Module v1 (`packages/costs`) — see COSTS_MODULE.md
- [x] Rate card (`rates.ts`) seeded from `PRICING_REFERENCE.md` with `asOf` + source URLs + `FREE_TIER` allowances
- [x] `estimateCost()` implemented for **all six targets** (lambda/fargate/ec2/static-cdn/apprunner/amplify) + surfaced in UI target picker via `/estimates` endpoint
- [ ] Resource tagging in Pulumi: `td:project/team/env/deploymentId/target`
- [x] **Free-tier meters**: catalog + `meterStatus` + `GET /meters` + `PUT /meters/usage` ingest + **usage poller handler** (`scheduled/usage-poller` — CloudWatch `getMetricSum` → meter upsert) _(EventBridge schedule wired at AWS setup)_
- [x] Alert evaluation + delivery: `summarizeAlerts`/`isBreached` + `GET /meters/alerts` + **alert handler** (`scheduled/alerts` — emails admin via Nodemailer on breach) _(EventBridge schedule wired at AWS setup)_
- [~] Dashboard: `/costs` page with **meter bars** ✓; per-project cost estimate + overview pending

## 8. Feature Flags Expansion
- [~] Flags wired into UI availability + API create validation (`isTargetEnabled`/`enabledTargets` in core); driver-level flag checks pending (drivers stubbed)
- [x] Target allow-list respected: UI filters the picker to enabled targets; API `create` rejects a disabled target (400)
- [x] Cost warning on always-on targets (apprunner/ecs-fargate/ec2) in the create form

## 9. Verify
- [x] Unit tests (Vitest): framework detection, cost estimators, meter status, provider webhook parsing + HMAC signature verify, config flags — **18 passing** (`pnpm test`)
- [ ] Matrix: {github, gitlab, bitbucket, zip} × {lambda, amplify, static-cdn, apprunner, ecs-fargate}
- [ ] Env/secret injection verified per target
- [ ] Rollback verified on lambda + static-cdn + amplify
- [ ] Costs Module: estimates match a hand-calc; meters read real usage; an alert fires at threshold
