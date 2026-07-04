/**
 * Drizzle schema (Neon Postgres). Core control-plane tables — see PLAN.md §10.
 * Ephemeral/hot state (stack locks, idempotency keys) lives in DynamoDB, not here.
 */

import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["owner", "admin", "developer", "viewer"]);
export const targetEnum = pgEnum("target_kind", [
  "lambda",
  "amplify",
  "static-cdn",
  "apprunner",
  "ecs-fargate",
  "ec2",
]);
export const envEnum = pgEnum("environment_kind", ["production", "preview", "development"]);
export const deploymentStateEnum = pgEnum("deployment_state", [
  "queued",
  "building",
  "deploying",
  "ready",
  "failed",
  "destroyed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Better Auth tables (managed by better-auth; separate from domain `users`, linked by email) ---
export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMemberships = pgTable("team_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: roleEnum("role").notNull().default("developer"),
});

export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  role: roleEnum("role").notNull().default("developer"),
  token: text("token").notNull().unique(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  name: text("name").notNull(),
  target: targetEnum("target").notNull().default("lambda"),
  source: jsonb("source").notNull(), // { provider, repo, ref, zipKey }
  flags: jsonb("flags"), // per-project PlatformConfig overrides
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const environments = pgTable("environments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  kind: envEnum("kind").notNull().default("production"),
  name: text("name").notNull(),
});

export const deployments = pgTable("deployments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  environmentId: uuid("environment_id").references(() => environments.id).notNull(),
  commit: text("commit"),
  state: deploymentStateEnum("state").notNull().default("queued"),
  buildId: text("build_id"),
  targetRef: text("target_ref"),
  url: text("url"),
  estimatedCostUsd: text("estimated_cost_usd"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformConfig = pgTable("platform_config", {
  id: integer("id").primaryKey().default(1),
  config: jsonb("config").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  target: text("target"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Costs Module tables (COSTS_MODULE.md) land in Phase 2.
export const freeTierMeters = pgTable("free_tier_meters", {
  id: uuid("id").defaultRandom().primaryKey(),
  service: text("service").notNull(),
  metric: text("metric").notNull(),
  limitQty: text("limit_qty").notNull(),
  usedQty: text("used_qty").notNull().default("0"),
  unit: text("unit").notNull(),
  window: text("window").notNull().default("monthly"),
  resetAt: timestamp("reset_at"),
  enabled: boolean("enabled").notNull().default(true),
});
