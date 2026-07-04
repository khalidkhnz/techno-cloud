/**
 * Validated server-side environment (T3 Env + zod). Import `env` anywhere on the server
 * (API, workers, infra, db) for typed, validated access to configuration. Validation runs
 * at import time; set SKIP_ENV_VALIDATION=1 to bypass (e.g. during CI builds without secrets).
 *
 * Client/browser env for the Next.js app lives in `apps/web/env.ts` (@t3-oss/env-nextjs).
 */

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3001),

    // Database (Neon — use the pooled endpoint)
    DATABASE_URL: z.string().url(),

    // AWS
    AWS_REGION: z.string().default("us-east-1"),
    ARTIFACTS_BUCKET: z.string().optional(),
    PULUMI_STATE_BUCKET: z.string().optional(),
    PULUMI_LOCK_TABLE: z.string().optional(),
    ECR_REGISTRY: z.string().optional(),
    BUILD_PROJECT_NAME: z.string().optional(),
    DEPLOY_PROJECT_NAME: z.string().optional(),
    SSM_PREFIX: z.string().optional(),
    STACK_LOCK_TABLE: z.string().optional(),
    IDEMPOTENCY_TABLE: z.string().optional(),
    BUILD_QUEUE_URL: z.string().url().optional(),
    DEPLOY_QUEUE_URL: z.string().url().optional(),

    // Auth (Better Auth)
    BETTER_AUTH_SECRET: z.string().min(1).optional(),
    BETTER_AUTH_URL: z.string().url().optional(),
    APP_ORIGIN: z.string().url().optional(),

    // Webhook signing secrets (required per provider to accept its webhooks; fail-closed if unset)
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    GITLAB_WEBHOOK_SECRET: z.string().optional(),
    BITBUCKET_WEBHOOK_SECRET: z.string().optional(),

    // Email (Nodemailer / SES)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default("no-reply@deploy.internal"),

    // Platform
    BASE_DOMAIN: z.string().default("deploy.internal"),
    ADMIN_EMAIL: z.string().email().optional(), // seeded as the first owner (invite-only bootstrap)
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

export type Env = typeof env;
