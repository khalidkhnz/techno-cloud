"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Project } from "../../lib/api";
import { signOut, useSession } from "../../lib/auth-client";

const TARGETS = ["lambda", "amplify", "static-cdn", "apprunner", "ecs-fargate", "ec2"];

export default function ProjectsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("lambda");
  const [repo, setRepo] = useState("");
  const [estimates, setEstimates] = useState<
    Record<string, { monthlyLowUsd: number; monthlyHighUsd: number }>
  >({});

  const load = () =>
    api
      .listProjects()
      .then(setProjects)
      .catch((e) => setError(String(e)));

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
      return;
    }
    if (session) {
      load();
      api.getEstimates().then(setEstimates).catch(() => {});
    }
  }, [isPending, session, router]);

  const est = estimates[target];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createProject({
        teamId: "00000000-0000-0000-0000-000000000000",
        name,
        target,
        source: { provider: "github", repo },
      });
      setName("");
      setRepo("");
      load();
    } catch (e) {
      setError(String(e));
    }
  }

  if (isPending || !session) return null;

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Projects</h1>
        <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/admin/invite">Invite user</Link>
          <button onClick={() => signOut().then(() => router.replace("/login"))}>Sign out</button>
        </span>
      </div>

      <form onSubmit={create} style={{ display: "grid", gap: 8, margin: "1rem 0", maxWidth: 420 }}>
        <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {TARGETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {est && (
          <small style={{ color: "#888" }}>
            Est. ~${est.monthlyLowUsd}–${est.monthlyHighUsd}/mo
          </small>
        )}
        <button type="submit">Create project</button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`}>{p.name}</Link> <small style={{ color: "#888" }}>({p.target})</small>
          </li>
        ))}
        {projects.length === 0 && <li style={{ color: "#888" }}>No projects yet.</li>}
      </ul>
    </main>
  );
}
