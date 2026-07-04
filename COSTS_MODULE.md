# Costs Module

A first-class subsystem (`packages/costs` + dashboard) that answers three questions:
**"What will this cost?"**, **"What is it costing right now?"**, and **"Are we about to leave a free tier?"**

It exists because the whole point of the serverless-first design is staying near-free — and you only
stay near-free if you can *see* the meters. Rates come from `PRICING_REFERENCE.md`.

---

## 1. Goals

- **Estimate before deploy** — show projected cost in the target picker and on the deploy screen.
- **Track actuals** — reconcile estimates against real AWS/Neon spend, attributed per app/team/env.
- **Free-tier meters** — progress bars toward each always-free limit with alerts *before* billing starts.
- **Budgets & alerts** — notify when projected/actual spend crosses a threshold.

---

## 2. Two data paths

### A. Estimated (real-time, pre-spend)
- Each `DeployTarget.estimateCost(config)` returns a `CostEstimate` from a **priced rate card**
  (`packages/costs/rates.ts`, mirroring `PRICING_REFERENCE.md`, with an `asOf` date + source URLs).
- Inputs: target kind, vCPU/mem/instance size, expected requests, always-on vs scale-to-zero, storage,
  data transfer, build minutes.
- Output: `{ monthlyLow, monthlyHigh, breakdown[], freeTierApplied }`.
- Used in: target selection ("Lambda ~$0–2 vs Fargate ~$14/mo"), deploy confirmation, project settings.

### B. Actual (reconciled, post-spend)
- **Tag every AWS resource** at provision time (in Pulumi) with:
  `td:project`, `td:team`, `td:env`, `td:deploymentId`, `td:target`.
- Pull actuals from **AWS Cost Explorer API** (`GetCostAndUsage`, grouped by tag) — note Cost Explorer
  API calls cost **$0.01 each**, so cache daily.
- Optionally enable **Cost & Usage Report (CUR) → S3 → Athena** for line-item granularity at scale.
- Pull **Neon** usage via Neon API (storage GB, CU-hours) and **Amplify** build/serve metrics via
  CloudWatch.
- Attribute cost per app via the `td:*` tags; store daily `CostSnapshot` rows.

---

## 3. Free-tier meters

Track consumption against each **always-free** allowance and surface headroom. Reset monthly.

| Meter | Limit (always-free unless noted) | Source metric |
|---|---|---|
| Lambda requests | 1,000,000 / mo | CloudWatch `Invocations` |
| Lambda compute | 400,000 GB-s / mo | `Duration` × memory |
| SQS requests | 1,000,000 / mo | CloudWatch `NumberOfMessages*` |
| DynamoDB storage | 25 GB | Table size metric |
| CloudWatch Logs | 5 GB ingest / mo | `IncomingBytes` |
| CodeBuild | 100 build-min / mo | build duration sum |
| EventBridge Scheduler | 14,000,000 / mo | invocation count |
| CloudFront | 1 TB out + 10M req / mo | distribution metrics |
| Amplify (12-mo) | 1,000 build-min · 15 GB served · 500k SSR req · 100 GB-hr | Amplify metrics |
| Neon (free plan) | 0.5 GB storage · 100 CU-hr / project / mo | Neon API |

**Alert thresholds:** warn at **80%**, alert at **95%**, breach at **100%** → notification + dashboard
flag. Amplify and Neon meters also warn when the 12-month / free-plan window is the binding constraint.

---

## 4. Data model (Neon Postgres)

```
UsageRecord   (id, service, project_id, deployment_id, metric, quantity, unit, period_start, period_end)
CostSnapshot  (id, scope[global|team|project|deployment], ref_id, estimated_usd, actual_usd, period, source)
FreeTierMeter (id, service, metric, limit_qty, used_qty, unit, window[monthly|12mo|free-plan], reset_at)
Budget        (id, scope, ref_id, threshold_usd, period, alert_channel, enabled)
RateCard      (service, sku, unit, price_usd, as_of, source_url)   // seeded from PRICING_REFERENCE.md
```

---

## 5. Dashboard views

- **Overview** — total est. vs actual this month; free-tier headroom bars; top-5 costliest apps.
- **Per project / env** — cost + usage (invocations, GB-s, build-min, served GB, storage); est vs actual.
- **Per deployment** — cost of a single build+deploy; running cost since deploy.
- **Free-tier meters** — every meter with % used, projected month-end, and days-left-in-window.
- **Budgets** — thresholds + status; edit/create.

---

## 6. Alerts & budgets

- **AWS Budgets + SNS** for account-level guardrails (belt-and-suspenders vs our own meters).
- App-level: EventBridge Scheduler → Lambda evaluates meters/budgets daily → **Nodemailer** email
  (+ Slack hook later).
- Triggers: free-tier ≥ 80/95/100%, budget ≥ threshold, projected month-end > budget, Neon/​Amplify
  window nearing expiry.

---

## 7. Build phases

- **v1 (Phase 2):** rate card + `estimateCost()` surfaced in UI; free-tier meters from CloudWatch/Neon;
  80/95/100% alerts. This is the "stay free" MVP — ship it early.
- **v2 (Phase 3):** Cost Explorer reconciliation (est vs actual), per-deployment attribution via tags,
  budgets, CUR/Athena option for line-item detail.
- **v3 (Phase 4):** anomaly detection, rightsizing suggestions ("this Fargate app is idle 90% — move to
  Lambda, save ~$12/mo"), showback/chargeback per team.

---

## 8. Notes

- Keep `RateCard.as_of` current; add a scheduled job to flag rates older than 90 days for re-verification.
- Cost Explorer API calls cost $0.01 — cache daily, never per-page-load.
- Estimates are ranges (low/high), never single false-precision numbers; always show `freeTierApplied`.
