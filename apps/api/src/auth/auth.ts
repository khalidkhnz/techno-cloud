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
  sessions,
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
    },
  }),
  emailAndPassword: { enabled: true },
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
      },
    },
  },
  trustedOrigins: [env.APP_ORIGIN ?? "http://localhost:3000"],
});

export type Auth = typeof auth;
