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
    <main style={{ fontFamily: "system-ui", padding: "3rem", maxWidth: 420 }}>
      <h1>Sign in</h1>
      <p style={{ color: "#888" }}>Invite-only. Enter your email to receive a one-time code.</p>

      {!sent ? (
        <form onSubmit={sendCode} style={{ display: "grid", gap: 8 }}>
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} style={{ display: "grid", gap: 8 }}>
          <input
            inputMode="numeric"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <button type="button" onClick={() => setSent(false)} style={{ background: "none", border: "none", color: "#1e6fd9", cursor: "pointer" }}>
            Use a different email
          </button>
        </form>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}
