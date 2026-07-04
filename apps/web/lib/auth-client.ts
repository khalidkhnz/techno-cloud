"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { env } from "../env";

/**
 * Better Auth client (email/password + email OTP). The raw client is kept module-private and
 * only narrow, explicitly-typed wrappers are exported — otherwise the inferred client type
 * (which transitively references zod internals) isn't portable across the module boundary (TS2742).
 */
const client = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  plugins: [emailOTPClient()],
});

type AuthResult = { error: { message?: string } | null };

export function sendSignInOtp(email: string): Promise<AuthResult> {
  return client.emailOtp.sendVerificationOtp({ email, type: "sign-in" }) as Promise<AuthResult>;
}

export function verifyOtp(email: string, otp: string): Promise<AuthResult> {
  return client.signIn.emailOtp({ email, otp }) as Promise<AuthResult>;
}

export function signOut(): Promise<unknown> {
  return client.signOut();
}

export interface SessionState {
  data: { user?: { email?: string } } | null;
  isPending: boolean;
}

export function useSession(): SessionState {
  return client.useSession() as unknown as SessionState;
}
