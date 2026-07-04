"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type AuditLog } from "../../../lib/api";
import { useSession } from "../../../lib/auth-client";

export default function AuditPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
      return;
    }
    if (session) api.getAudit().then(setLogs).catch((e) => setError(String(e)));
  }, [isPending, session, router]);

  if (isPending || !session) return null;

  return (
    <main className="container-app">
      <Link href="/projects" className="text-sm">
        ← Projects
      </Link>
      <h1 className="mt-2">Audit log</h1>
      <p className="muted">Recent mutating actions (admin only).</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {logs.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
            <code className="rounded bg-neutral-100 px-1">{l.action}</code>
            <span className="muted">{l.meta?.actorEmail ?? "system"}</span>
            <span className="muted ml-auto">{new Date(l.createdAt).toLocaleString()}</span>
          </li>
        ))}
        {logs.length === 0 && <li className="muted px-4 py-2">No audit entries.</li>}
      </ul>
    </main>
  );
}
