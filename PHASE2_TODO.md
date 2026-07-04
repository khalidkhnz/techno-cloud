# Phase 2 — Breadth + Costs Module v1

**Goal:** Go from two targets to the full set, add all git sources, framework detection, env/secrets,
rollback — and ship **Costs Module v1** so the platform's "stay near-free" promise is observable from
day one. The pluggable interfaces from Phase 1 make each target/source additive.

**Exit criteria:** A project can be sourced from GitHub/GitLab/Bitbucket/zip, deployed to any of
Lambda / Amplify / Static-CDN / App Runner / ECS Fargate, with env/secrets injected and rollback,
and the Costs Module shows per-app estimates + free-tier meters with alerts.

---

## 1. Source Providers (complete the set)
- [ ] `gitlab`: webhooks, clone via token, commit status (SaaS + self-hosted URL config)
- [ ] `bitbucket`: webhooks, clone, build status
- [ ] Provider-agnostic webhook router; per-provider creds encrypted in Parameter Store, admin-configurable

## 2. Framework Detection
- [ ] Detector: inspect repo for Dockerfile, `package.json`, framework signatures
- [ ] Recommend default target: Next.js/SSR → **Amplify**, static export → **static-cdn**, API → **Lambda**, long-running → Fargate
- [ ] Nixpacks build/start overrides in project settings
- [ ] Static-build path (framework `build` → output dir → S3)

## 3. Deploy Targets (add remaining drivers)
- [ ] `static-cdn`: S3 + CloudFront + OAC + subdomain/custom-domain wiring
- [ ] `apprunner`: App Runner service from ECR image, autoscaling config (flag it as non-scale-to-zero in UI)
- [ ] `ecs-fargate`: **arm64** task def + service + ALB target group + autoscaling (opt-in, cost-flagged)
- [ ] Each implements full interface incl. `estimateCost()` and `streamLogs()`
- [ ] Target picker shows recommended default + **cost estimate per target** (from Costs Module)

## 4. Environment & Secrets
- [ ] `EnvVar`, `Secret` scoped by project + environment (prod/preview/dev)
- [ ] Store in **SSM Parameter Store (standard, free)**; Secrets Manager only when rotation needed
- [ ] Inject into Lambda / Amplify / task env at deploy time
- [ ] UI: add/edit/remove; values write-once, never rendered back; audit access

## 5. Environments
- [ ] `Environment` records per project (production baseline)
- [ ] Per-environment config, env vars, target settings; read in `DeployContext`

## 6. Rollback
- [ ] Track immutable artifacts (image tags / static versions / Amplify job ids) per deployment
- [ ] `rollback(toDeploymentId)` re-points target to prior artifact via Pulumi (no rebuild)
- [ ] UI: deployment history + one-click rollback + confirm
- [ ] Guard: no rollback to failed/destroyed deployments

## 7. Costs Module v1 (`packages/costs`) — see COSTS_MODULE.md
- [x] Rate card (`rates.ts`) seeded from `PRICING_REFERENCE.md` with `asOf` + source URLs + `FREE_TIER` allowances
- [~] `estimateCost()` implemented per target _(done: lambda/fargate/ec2 estimators, wired into lambda+amplify drivers; remaining: static-cdn/apprunner + surface in UI)_
- [ ] Resource tagging in Pulumi: `td:project/team/env/deploymentId/target`
- [ ] **Free-tier meters** from CloudWatch + Neon API (Lambda, SQS, DynamoDB, CodeBuild, CloudWatch, CloudFront, Amplify, Neon)
- [ ] Alerts at 80/95/100% via EventBridge Scheduler → Lambda → Nodemailer
- [ ] Dashboard: overview + per-project cost estimate + meter bars

## 8. Feature Flags Expansion
- [ ] Wire `staticCdn`, `appRunner`, `ecsFargate` flags into drivers + UI availability
- [ ] Per-project target allow-list respected in UI + API
- [ ] Cost-flag warnings when enabling always-on targets

## 9. Verify
- [ ] Matrix: {github, gitlab, bitbucket, zip} × {lambda, amplify, static-cdn, apprunner, ecs-fargate}
- [ ] Env/secret injection verified per target
- [ ] Rollback verified on lambda + static-cdn + amplify
- [ ] Costs Module: estimates match a hand-calc; meters read real usage; an alert fires at threshold
