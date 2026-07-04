"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Project } from "../../lib/api";

const TARGETS = ["lambda", "amplify", "static-cdn", "apprunner", "ecs-fargate", "ec2"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("lambda");
  const [repo, setRepo] = useState("");

  const load = () =>
    api
      .listProjects()
      .then(setProjects)
      .catch((e) => setError(String(e)));

  useEffect(() => {
    load();
  }, []);

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

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 760 }}>
      <h1>Projects</h1>

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
