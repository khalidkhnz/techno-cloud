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
    <main className="container-app max-w-md">
      <Link href="/projects" className="text-sm">
        ← Projects
      </Link>
      <h1 className="mt-2">Invite a user</h1>
      <form onSubmit={invite} className="card mt-4 grid gap-2">
        <input
          className="input"
          type="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Send invite
        </button>
      </form>
      {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
