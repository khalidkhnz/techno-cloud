"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Deployment, type EnvVar, type Environment, type Project } from "../../../lib/api";

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
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [ek, setEk] = useState("");
  const [ev, setEv] = useState("");
  const [eSecret, setESecret] = useState(false);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [envName, setEnvName] = useState("");
  const [envKind, setEnvKind] = useState("development");
  const [error, setError] = useState<string | null>(null);

  const loadEnv = () => api.listEnvVars(id).then(setEnvVars).catch(() => {});
  const loadEnvs = () => api.listEnvironments(id).then(setEnvs).catch(() => {});

  const load = () => {
    api.getProject(id).then(setProject).catch((e) => setError(String(e)));
    api.listDeployments(id).then(setDeployments).catch((e) => setError(String(e)));
    loadEnv();
    loadEnvs();
  };

  async function addEnvironment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createEnvironment(id, { kind: envKind, name: envName });
      setEnvName("");
      loadEnvs();
    } catch (e) {
      setError(String(e));
    }
  }

  async function addEnvVar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.upsertEnvVar(id, { key: ek, value: ev, isSecret: eSecret });
      setEk("");
      setEv("");
      setESecret(false);
      loadEnv();
    } catch (e) {
      setError(String(e));
    }
  }

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
            {d.state === "ready" && (
              <>
                {" "}
                <button
                  onClick={() =>
                    api.rollbackDeployment(id, d.id).then(load).catch((e) => setError(String(e)))
                  }
                >
                  rollback to this
                </button>
              </>
            )}
          </li>
        ))}
        {deployments.length === 0 && <li style={{ color: "#888" }}>No deployments yet.</li>}
      </ul>

      <h2 style={{ marginTop: "1.5rem" }}>Environments</h2>
      <ul>
        {envs.map((en) => (
          <li key={en.id}>
            <strong>{en.name}</strong> <small style={{ color: "#888" }}>({en.kind})</small>
            {en.kind !== "production" && (
              <>
                {" "}
                <button onClick={() => api.deleteEnvironment(id, en.id).then(loadEnvs)}>remove</button>
              </>
            )}
          </li>
        ))}
        {envs.length === 0 && <li style={{ color: "#888" }}>No environments yet.</li>}
      </ul>
      <form onSubmit={addEnvironment} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input placeholder="name" value={envName} onChange={(e) => setEnvName(e.target.value)} required />
        <select value={envKind} onChange={(e) => setEnvKind(e.target.value)}>
          <option value="development">development</option>
          <option value="preview">preview</option>
          <option value="production">production</option>
        </select>
        <button type="submit">Add environment</button>
      </form>

      <h2 style={{ marginTop: "1.5rem" }}>Environment variables</h2>
      <p style={{ color: "#888", fontSize: 12 }}>Scope: production. Secrets are stored in Parameter Store and shown as ***.</p>
      <ul>
        {envVars.map((v) => (
          <li key={v.id}>
            <code>{v.key}</code> = <code>{v.value}</code>
            {v.isSecret && <span style={{ color: "#b8860b" }}> (secret)</span>}{" "}
            <button onClick={() => api.deleteEnvVar(id, v.key).then(loadEnv)}>remove</button>
          </li>
        ))}
        {envVars.length === 0 && <li style={{ color: "#888" }}>No variables.</li>}
      </ul>
      <form onSubmit={addEnvVar} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="KEY" value={ek} onChange={(e) => setEk(e.target.value)} required />
        <input placeholder="value" value={ev} onChange={(e) => setEv(e.target.value)} required />
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={eSecret} onChange={(e) => setESecret(e.target.checked)} /> secret
        </label>
        <button type="submit">Add</button>
      </form>
    </main>
  );
}
