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
- [~] Role enforcement: Owner/Admin/TeamAdmin/ProjectMember guards ✓; Developer-vs-Viewer write/read distinction pending
- [x] Team management: create team (caller→owner), list, members (add by email/invite, remove, role update) — API + `/admin/teams` UI, team-admin gated
- [x] Project ownership by team; **access checks on every project-scoped route** (`ProjectMemberGuard` — fixes IDOR); project list/create team-scoped
- [x] Invite flow extended to team + role assignment (addMember emails an invite carrying the role)

## 4. Audit Logs
- [x] `AuditLog` writes: **global interceptor** auto-audits every mutating request (deploy, rollback, config update, env/secret changes, invite, environment create/delete) with actor resolved from session
- [~] Queryable via `GET /audit` (**Owner**-gated, platform-wide) + `/admin/audit` UI; per-team scoping + filters (actor/project/action/time) pending
- [ ] Retention policy config

## 5. WebSocket Live Logs (upgrade from polling)
- [~] **API Gateway WebSocket API** + Lambda handler ($connect/$disconnect/subscribe) + connections DynamoDB (TTL) + `postToConnection` — authored/typechecks; CloudWatch→WS log pusher pending
- [~] UI **live log streaming** (auto-poll every 3s now; WebSocket client upgrade pending)
- [x] Polling fallback (UI auto-polls; soft-fails)

## 6. Costs Module v2 — see COSTS_MODULE.md
- [x] **Cost Explorer** reconciliation — `getCostByProject` (`GetCostAndUsage` grouped by `td:project`); daily `scheduled/cost-snapshot` poller stores `CostSnapshot`s (cached daily)
- [~] Estimated vs actual — actuals per project + global stored; estimated column present; per-env/deployment attribution pending
- [x] **Budgets**: thresholds per scope (CRUD API + `/costs` UI); breach → admin email from the poller
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
