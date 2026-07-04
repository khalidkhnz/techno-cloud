"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendSignInOtp, verifyOtp } from "../../lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await sendSignInOtp(email);
    setBusy(false);
    if (error) setError(error.message ?? "Failed to send code");
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await verifyOtp(email, otp);
    setBusy(false);
    if (error) setError(error.message ?? "Invalid code");
    else router.push("/projects");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="card">
        <h1>Sign in</h1>
        <p className="muted mt-1">Invite-only. Enter your email to receive a one-time code.</p>

        {!sent ? (
          <form onSubmit={sendCode} className="mt-4 grid gap-2">
            <input
              className="input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-4 grid gap-2">
            <input
              className="input tracking-[0.3em]"
              inputMode="numeric"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
