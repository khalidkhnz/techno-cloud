"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ALWAYS_ON_TARGETS, TARGET_FLAG, api, type PlatformConfig, type Project } from "../../lib/api";
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
  const [config, setConfig] = useState<PlatformConfig | null>(null);

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
      api.getPlatformConfig().then(setConfig).catch(() => {});
    }
  }, [isPending, session, router]);

  const est = estimates[target];
  const availableTargets = config
    ? TARGETS.filter((t) => config.targets[TARGET_FLAG[t] ?? ""])
    : TARGETS;

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
    <main className="container-app">
      <div className="flex items-center justify-between">
        <h1>Projects</h1>
        <span className="flex items-center gap-4 text-sm">
          <Link href="/costs">Costs</Link>
          <Link href="/admin/audit">Audit</Link>
          <Link href="/admin/invite">Invite user</Link>
          <button className="btn btn-secondary" onClick={() => signOut().then(() => router.replace("/login"))}>
            Sign out
          </button>
        </span>
      </div>

      <form onSubmit={create} className="card mt-4 grid max-w-md gap-2">
        <input className="input" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
          {availableTargets.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {est && (
          <p className="muted">
            Est. ~${est.monthlyLowUsd}–${est.monthlyHighUsd}/mo
          </p>
        )}
        {ALWAYS_ON_TARGETS.includes(target) && (
          <p className="text-sm text-amber-600">⚠ Always-on target — billed 24/7 (does not scale to zero).</p>
        )}
        <button className="btn" type="submit">
          Create project
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <Link href={`/projects/${p.id}`} className="font-medium">
              {p.name}
            </Link>
            <span className="badge bg-neutral-100 text-neutral-600">{p.target}</span>
          </li>
        ))}
        {projects.length === 0 && <li className="muted px-4 py-3">No projects yet.</li>}
      </ul>
    </main>
  );
}
