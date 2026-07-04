"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

function AcceptInvite() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    api
      .acceptInvite(token)
      .then((r) => {
        if (r.ok) {
          setEmail(r.email ?? null);
          setStatus("ok");
        } else setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "pending") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Accepting your invite…
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="grid gap-3">
        <p className="flex items-center gap-2 text-sm text-red-300">
          <XCircle className="h-4 w-4" /> This invite link is invalid or expired.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-2 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4" /> Invite accepted{email ? ` for ${email}` : ""}.
      </p>
      <Button asChild className="glow">
        <Link href="/login">
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default function AcceptInvitePage() {
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
          <h1 className="text-lg font-semibold tracking-tight">Accept invite</h1>
          <div className="mt-4">
            <Suspense
              fallback={
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              }
            >
              <AcceptInvite />
            </Suspense>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
