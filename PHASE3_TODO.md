# Phase 3 — Org-Scale Features + Costs Module v2

**Goal:** Make it pleasant and safe org-wide: preview URLs with auto-cleanup, custom domains + TLS,
real RBAC/teams, audit logs, WebSocket live logs, and **Costs Module v2** (reconciled actuals +
budgets). This is where the "Vercel feel" lands — on serverless economics.

**Exit criteria:** A PR gets an ephemeral preview URL that auto-destroys on merge/close; teams own
projects with role-based access; admins map custom domains with auto TLS and toggle features/limits;
the Costs Module reconciles estimated vs actual spend per project and enforces budgets.

---

## 1. Preview / Branch Deployments
- [ ] On PR open/push: ephemeral `Environment` + Pulumi stack `project:preview-<pr>`
- [ ] Default previews to **serverless targets** (Lambda/Amplify/Static) to keep them ~free
- [ ] Assign preview subdomain (`<app>-pr-<n>.deploy.internal`)
- [ ] Post preview URL back as commit/PR comment via SourceProvider
- [ ] **Reaper** (EventBridge Scheduler → Lambda): destroy on PR merge/close OR after `previewTTLHours`
- [ ] `previews.enabled` flag gates the path; max-previews-per-project guardrail

## 2. Custom Domains + Auto TLS
- [ ] `Domain` model: hostname, project, verification + cert status
- [ ] Verification flow (DNS TXT/CNAME instructions in UI)
- [ ] **ACM** cert request + DNS validation automation (ACM is free)
- [ ] Attach cert to CloudFront / Amplify / ALB + host routing
- [ ] `customDomains.enabled` flag

## 3. RBAC & Teams
- [ ] Full role enforcement: `Owner / Admin / Developer / Viewer` scoped Team → Project
- [ ] Team management UI: create team, add/remove members, assign roles
- [ ] Project ownership by team; access checks on every route
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
- [ ] Deploy success/failure notifications (email via Nodemailer; Slack hook stub)
- [ ] Per-user / per-project notification preferences

## 8. Verify
- [ ] Preview lifecycle: open PR → URL → merge → auto-destroy
- [ ] Custom domain end-to-end with valid TLS
- [ ] RBAC negative tests (Viewer cannot deploy, etc.)
- [ ] Audit entries for all mutating actions
- [ ] Costs Module: actual within tolerance of estimate; budget breach fires an alert
