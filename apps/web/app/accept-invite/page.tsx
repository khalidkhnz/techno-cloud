"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";

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
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "pending") return <p>Accepting your invite…</p>;
  if (status === "error")
    return <p style={{ color: "crimson" }}>This invite link is invalid or expired.</p>;

  return (
    <>
      <p>Invite accepted{email ? ` for ${email}` : ""}. You can now sign in.</p>
      <p>
        <Link href="/login">→ Sign in</Link>
      </p>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "3rem", maxWidth: 420 }}>
      <h1>Accept invite</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <AcceptInvite />
      </Suspense>
    </main>
  );
}
