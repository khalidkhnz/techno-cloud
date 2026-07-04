# Deployment Runbook (AWS bring-up)

How to stand up Techno-Deployer on a real AWS account. The code is complete; this is the ops
sequence. All infra is authored in `infra/` (Pulumi). See `PLAN.md` for architecture.

---

## 0. Prerequisites

- AWS account + credentials (`aws configure`) — use the **Paid Plan** so all always-free services
  are unrestricted (see `PRICING_REFERENCE.md`).
- [Pulumi CLI](https://www.pulumi.com/docs/install/), Node 22, pnpm 10.
- A **Neon** project (pooled connection string) — see `PRICING_REFERENCE.md`.
- A domain you can delegate to Route 53 (for `BASE_DOMAIN`, e.g. `deploy.internal`).

---

## 1. State backend (bootstrap)

The Pulumi state bucket is defined in the stack, so bootstrap the backend out-of-band once:

```bash
aws s3 mb s3://td-dev-pulumi-state
aws dynamodb create-table --table-name td-dev-pulumi-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
pulumi login s3://td-dev-pulumi-state
```

## 2. Stack config

```bash
cd infra
pulumi stack init dev
pulumi config set aws:region us-east-1
pulumi config set techno-deployer:baseDomain deploy.internal
pulumi config set techno-deployer:controlRepo https://github.com/khalidkhnz/techno-cloud
pulumi config set --secret techno-deployer:databaseUrl "postgresql://...-pooler.../db?sslmode=require"
pulumi config set --secret techno-deployer:betterAuthSecret "$(openssl rand -base64 32)"
```

## 3. Parameter Store secrets (read by the deploy CodeBuild job)

```bash
aws ssm put-parameter --name /td-dev/DATABASE_URL --type SecureString --value "postgresql://...-pooler.../db?sslmode=require"
aws ssm put-parameter --name /td-dev/PULUMI_CONFIG_PASSPHRASE --type SecureString --value "<passphrase>"
```

## 4. Package the API bundle

> ⚠️ **Packaging**: the platform Lambdas (`infra/platform.ts`) point `code` at `apps/api/dist`.
> `nest build` alone is **not** self-contained — bundle dependencies first (esbuild targeting each
> handler, or ship `node_modules` via a Lambda layer). Produce a self-contained `apps/api/dist`
> (handlers: `lambda.handler`, `workers/*.handler`, `scheduled/*.handler`) before `pulumi up`.

```bash
pnpm install --frozen-lockfile
pnpm build
# + your bundling step producing a self-contained apps/api/dist
```

## 5. Provision

```bash
cd infra && pulumi up
```

This creates: S3 (state/artifacts), DynamoDB (locks/idempotency), SQS (build/deploy + DLQs), ECR,
Route 53 zone, ACM wildcard cert, IAM roles (+ app permissions boundary), CodeBuild build + deploy
projects, the API/worker/scheduled Lambdas (+ Function URL, SQS mappings, EventBridge schedules),
and the Amplify frontend app.

## 6. DNS + TLS

- Delegate `BASE_DOMAIN` to the Route 53 zone's name servers (`pulumi stack output nameServers`).
- ACM validates automatically once DNS resolves.

## 7. Database migrate + seed

```bash
export DATABASE_URL="postgresql://...-pooler.../db?sslmode=require"
export ADMIN_EMAIL="you@company.com"
pnpm --filter @techno-deployer/db db:migrate
pnpm --filter @techno-deployer/db db:seed   # default team + PlatformConfig + owner invite
```

## 8. Git provider webhooks

- Create a GitHub App (or GitLab/Bitbucket integration); set the webhook URL to
  `<apiFunctionUrl>/webhooks/github` (etc.).
- Store the signing secret in the API Lambda env (`GITHUB_WEBHOOK_SECRET`, ...) — fail-closed
  verification requires it.

## 9. Sign in

- Open the Amplify URL (`pulumi stack output webDefaultDomain`), go to `/login`, enter `ADMIN_EMAIL`,
  and complete the OTP (delivered via SES once SMTP is configured; logged to the API in dev).
- You're now owner of the Default team.

---

## Outputs

```bash
pulumi stack output apiFunctionUrl
pulumi stack output webDefaultDomain
pulumi stack output ecrRepositoryUrl
pulumi stack output buildProjectName deployProjectName
```

## Post-bring-up hardening (see PHASE3/PHASE4 TODOs)

- Custom domains + ACM per target; WebSocket log streaming.
- Tighten CodeBuild IAM to per-project STS AssumeRole (PHASE4 §7).
- Drift detection (scheduled `pulumi preview`), DR backups/restore drill.
- SES production access for OTP/alert email; per-provider webhook creds in Parameter Store.
