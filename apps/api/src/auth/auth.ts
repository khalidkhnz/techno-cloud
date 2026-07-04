/**
 * Better Auth server config. Email/password + email OTP, invite-only (a user can only be
 * created if their email has a pending invite). Sessions/users live in the Better Auth tables
 * (auth_users/sessions/accounts/verifications); domain `users` is linked by email downstream.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import {
  accounts,
  authUsers,
  db,
  eq,
  invites,
  rateLimits,
  sessions,
  teamMemberships,
  users,
  verifications,
} from "@techno-deployer/db";
import { env } from "@techno-deployer/env";
import { sendOtpEmail } from "./mailer.js";

export const auth = betterAuth({
  ...(env.BETTER_AUTH_SECRET ? { secret: env.BETTER_AUTH_SECRET } : {}),
  ...(env.BETTER_AUTH_URL ? { baseURL: env.BETTER_AUTH_URL } : {}),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUsers,
      session: sessions,
      account: accounts,
      verification: verifications,
      rateLimit: rateLimits,
    },
  }),
  emailAndPassword: { enabled: true },
  // Durable rate limiting (Lambda is ephemeral — in-memory won't hold across invocations).
  // Mitigates brute-force / denial-of-wallet on the public Function URL.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 5 },
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type);
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        // Invite-only: reject sign-up unless the email has a pending invite.
        before: async (user) => {
          const [invite] = await db
            .select()
            .from(invites)
            .where(eq(invites.email, user.email));
          if (!invite || invite.acceptedAt) {
            throw new Error("This email has not been invited.");
          }
          return { data: user };
        },
        // Materialize the domain user + team membership (with the invited role) and
        // mark the invite accepted, so RBAC guards can resolve roles by email.
        after: async (user) => {
          const [invite] = await db
            .select()
            .from(invites)
            .where(eq(invites.email, user.email));

          const inserted = await db
            .insert(users)
            .values({ email: user.email, name: user.name ?? null })
            .onConflictDoNothing()
            .returning();
          const domainUser =
            inserted[0] ??
            (await db.select().from(users).where(eq(users.email, user.email)))[0];

          if (invite && domainUser) {
            await db
              .insert(teamMemberships)
              .values({ teamId: invite.teamId, userId: domainUser.id, role: invite.role });
            await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id));
          }
        },
      },
    },
  },
  trustedOrigins: [env.APP_ORIGIN ?? "http://localhost:3000"],
});

export type Auth = typeof auth;
