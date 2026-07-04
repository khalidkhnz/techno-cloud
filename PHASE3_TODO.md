# Phase 3 — Org-Scale Features + Costs Module v2

**Goal:** Make it pleasant and safe org-wide: preview URLs with auto-cleanup, custom domains + TLS,
real RBAC/teams, audit logs, WebSocket live logs, and **Costs Module v2** (reconciled actuals +
budgets). This is where the "Vercel feel" lands — on serverless economics.

**Exit criteria:** A PR gets an ephemeral preview URL that auto-destroys on merge/close; teams own
projects with role-based access; admins map custom domains with auto TLS and toggle features/limits;
the Costs Module reconciles estimated vs actual spend per project and enforces budgets.

---

## 1. Preview / Branch Deployments
- [x] On PR open: ephemeral env `pr-<n>` (kind preview) + per-PR stack (env-name naming) building the PR branch (`deployment.ref`); PR close → destroy — GitHub/GitLab/Bitbucket PR parsing
- [~] Previews use the project's target (serverless default via flags); per-PR isolation ✓
- [~] Preview URL from the deploy (Function URL / Amplify branch); dedicated `<app>-pr-<n>` subdomain pending
- [ ] Post preview URL back as commit/PR comment via SourceProvider (provider comment API pending)
- [x] **Reaper handler** (`scheduled/reaper`): finds preview envs whose latest deploy is older than `previewTtlHours` → triggers destroy (deploy CodeBuild `MODE=destroy`) → cleans DB _(EventBridge schedule + PR-close trigger wired at AWS setup)_
- [ ] `previews.enabled` flag gates the path; max-previews-per-project guardrail

## 2. Custom Domains + Auto TLS
- [x] `Domain` model (hostname, project, verified) + migration 0007; CRUD API
- [x] Verification flow — TXT instructions + real DNS TXT check (`POST /domains/:id/verify`) + UI
- [~] **ACM** cert / DNS validation — Amplify `DomainAssociation` auto-provisions the cert; CloudFront/ALB ACM path pending
- [~] Attach to **Amplify** on deploy when a verified domain exists (via `ctx.customDomain`); CloudFront/ALB attach pending
- [x] `customDomains.enabled` flag gate (add rejected when disabled)

## 3. RBAC & Teams
- [ ] Full role enforcement: `Owner / Admin / Developer / Viewer` scoped Team → Project
- [ ] Team management UI: create team, add/remove members, assign roles
- [x] Project ownership by team; **access checks on every project-scoped route** (`ProjectMemberGuard` — fixes IDOR); project list/create team-scoped
- [ ] Invite flow extended to team + role assignment

## 4. Audit Logs
- [x] `AuditLog` writes: **global interceptor** auto-audits every mutating request (deploy, rollback, config update, env/secret changes, invite, environment create/delete) with actor resolved from session
- [~] Queryable via `GET /audit` (**Owner**-gated, platform-wide) + `/admin/audit` UI; per-team scoping + filters (actor/project/action/time) pending
- [ ] Retention policy config

## 5. WebSocket Live Logs (upgrade from polling)
- [ ] **API Gateway WebSocket API** → Lambda → CloudWatch tail (note: WS free tier is 12-month only)
- [ ] UI switches from polling to WebSocket stream for build + runtime logs
- [ ] Fallback to polling if WS unavailable

## 6. Costs Module v2 — see COSTS_MODULE.md
- [ ] **Cost Explorer** reconciliation (`GetCostAndUsage` grouped by `td:*` tags; cache daily — $0.01/call)
- [ ] Estimated vs actual per project/env/deployment (`CostSnapshot`)
- [ ] **Budgets**: thresholds per scope + AWS Budgets/SNS backstop
- [ ] Optional CUR → S3 → Athena for line-item detail
- [ ] Neon + Amplify actuals via their APIs; window-expiry warnings (12-mo / free-plan)

## 7. Notifications
- [x] Deploy success/failure email via Nodemailer (sent from the deploy entrypoint on ready/failed)
- [~] Per-project notify email (`project.notifyEmail`, ADMIN_EMAIL fallback) ✓; per-user prefs + Slack hook pending

## 8. Verify
- [ ] Preview lifecycle: open PR → URL → merge → auto-destroy
- [ ] Custom domain end-to-end with valid TLS
- [ ] RBAC negative tests (Viewer cannot deploy, etc.)
- [ ] Audit entries for all mutating actions
- [ ] Costs Module: actual within tolerance of estimate; budget breach fires an alert
