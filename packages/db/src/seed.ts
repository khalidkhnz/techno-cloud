/**
 * Bootstrap seed. Creates the default team, the default PlatformConfig, and an OWNER invite for
 * ADMIN_EMAIL so the first admin can sign in (invite-only). After signing in via OTP, the Better
 * Auth `user.create.after` hook materializes their domain user + owner membership.
 *
 * Run: `ADMIN_EMAIL=you@company.com pnpm --filter @techno-deployer/db db:seed`
 */

import "./load-env.js"; // load root .env before env validation
import { randomUUID } from "node:crypto";
import { DEFAULT_PLATFORM_CONFIG } from "@techno-deployer/core";
import { env } from "@techno-deployer/env";
import { db } from "./client.js";
import { eq, invites, platformConfig, teams } from "./index.js";

// Fixed id so the current UI defaults (teamId "0000…") resolve to a real team.
const DEFAULT_TEAM_ID = "00000000-0000-0000-0000-000000000000";

async function seed(): Promise<void> {
  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) throw new Error("ADMIN_EMAIL is not set — cannot seed the first owner.");

  await db.insert(teams).values({ id: DEFAULT_TEAM_ID, name: "Default" }).onConflictDoNothing();

  // Upsert so re-seeding syncs feature flags (e.g. newly enabled deploy targets) into an existing DB.
  await db
    .insert(platformConfig)
    .values({ id: 1, config: DEFAULT_PLATFORM_CONFIG })
    .onConflictDoUpdate({ target: platformConfig.id, set: { config: DEFAULT_PLATFORM_CONFIG } });

  const [existing] = await db.select().from(invites).where(eq(invites.email, adminEmail));
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Invite for ${adminEmail} already exists (accepted=${Boolean(existing.acceptedAt)}).`);
    return;
  }

  await db.insert(invites).values({
    email: adminEmail,
    teamId: DEFAULT_TEAM_ID,
    role: "owner",
    token: randomUUID(),
  });
  // eslint-disable-next-line no-console
  console.log(`Seeded OWNER invite for ${adminEmail}. Sign in at /login with this email (OTP).`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
