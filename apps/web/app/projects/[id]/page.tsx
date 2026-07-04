"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Deployment, type Project } from "../../../lib/api";

const STATE_COLOR: Record<Deployment["state"], string> = {
  queued: "#888",
  building: "#b8860b",
  deploying: "#1e6fd9",
  ready: "#2e8b57",
  failed: "crimson",
  destroyed: "#555",
};

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.getProject(id).then(setProject).catch((e) => setError(String(e)));
    api.listDeployments(id).then(setDeployments).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    const t = setInterval(() => api.listDeployments(id).then(setDeployments).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [id]);

  async function deploy() {
    setError(null);
    try {
      await api.createDeployment(id);
      load();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 760 }}>
      <p>
        <Link href="/projects">← Projects</Link>
      </p>
      <h1>{project?.name ?? id}</h1>
      {project && <p style={{ color: "#888" }}>Target: {project.target}</p>}

      <button onClick={deploy}>Deploy</button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h2 style={{ marginTop: "1.5rem" }}>Deployments</h2>
      <ul>
        {deployments.map((d) => (
          <li key={d.id}>
            <span style={{ color: STATE_COLOR[d.state], fontWeight: 600 }}>{d.state}</span>{" "}
            <small style={{ color: "#888" }}>{new Date(d.createdAt).toLocaleString()}</small>
            {d.url && (
              <>
                {" — "}
                <a href={d.url} target="_blank" rel="noreferrer">
                  {d.url}
                </a>
              </>
            )}
          </li>
        ))}
        {deployments.length === 0 && <li style={{ color: "#888" }}>No deployments yet.</li>}
      </ul>
    </main>
  );
}
