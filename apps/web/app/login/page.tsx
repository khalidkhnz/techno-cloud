"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendSignInOtp, verifyOtp } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await sendSignInOtp(email);
    setBusy(false);
    if (error) toast.error(error.message ?? "Failed to send code");
    else {
      setSent(true);
      toast.success("Code sent — check your email");
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await verifyOtp(email, otp);
    setBusy(false);
    if (error) toast.error(error.message ?? "Invalid code");
    else router.push("/projects");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="glass rounded-2xl p-6">
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite-only. Enter your email to receive a one-time code.
          </p>

          <AnimatePresence mode="wait" initial={false}>
            {!sent ? (
              <motion.form
                key="email"
                onSubmit={sendCode}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="mt-5 grid gap-3"
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="glow">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send code <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                onSubmit={verify}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                className="mt-5 grid gap-3"
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="otp">Verification code</Label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="otp"
                      inputMode="numeric"
                      placeholder="6-digit code"
                      className="pl-9 tracking-[0.35em]"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Sent to {email}</p>
                </div>
                <Button type="submit" disabled={busy} className="glow">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setOtp("");
                  }}
                  className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Use a different email
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-600">
          <Link href="/" className="hover:text-foreground">
            ← Back
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
