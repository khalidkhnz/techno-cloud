"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useSession } from "../../../lib/auth-client";

const ROLES = ["owner", "admin", "developer", "viewer"];

export default function InviteUserPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session) return null;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await api.createInvite({
        email,
        teamId: "00000000-0000-0000-0000-000000000000",
        role,
      });
      setMsg(`Invite sent to ${email}.`);
      setEmail("");
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 420 }}>
      <p>
        <Link href="/projects">← Projects</Link>
      </p>
      <h1>Invite a user</h1>
      <form onSubmit={invite} style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit">Send invite</button>
      </form>
      {msg && <p style={{ color: "#2e8b57" }}>{msg}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}
