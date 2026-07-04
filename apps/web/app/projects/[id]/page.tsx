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
    <main className="container-app">
      <Link href="/projects" className="text-sm">
        ← Projects
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1>{project?.name ?? id}</h1>
          {project && <p className="muted">Target: {project.target}</p>}
        </div>
        <button className="btn" onClick={deploy}>
          Deploy
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <h2 className="mt-6">Deployments</h2>
      <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {deployments.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
            <span className="badge font-semibold" style={{ color: STATE_COLOR[d.state] }}>
              {d.state}
            </span>
            <span className="muted">{new Date(d.createdAt).toLocaleString()}</span>
            {d.url && (
              <a href={d.url} target="_blank" rel="noreferrer" className="truncate">
                {d.url}
              </a>
            )}
            {d.state === "ready" && (
              <button
                className="btn btn-secondary ml-auto"
                onClick={() =>
                  api.rollbackDeployment(id, d.id).then(load).catch((e) => setError(String(e)))
                }
              >
                Rollback to this
              </button>
            )}
          </li>
        ))}
        {deployments.length === 0 && <li className="muted px-4 py-3">No deployments yet.</li>}
      </ul>

      <h2 className="mt-6">Environments</h2>
      <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {envs.map((en) => (
          <li key={en.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>
              <strong>{en.name}</strong> <span className="muted">({en.kind})</span>
            </span>
            {en.kind !== "production" && (
              <button className="btn btn-secondary" onClick={() => api.deleteEnvironment(id, en.id).then(loadEnvs)}>
                remove
              </button>
            )}
          </li>
        ))}
        {envs.length === 0 && <li className="muted px-4 py-2">No environments yet.</li>}
      </ul>
      <form onSubmit={addEnvironment} className="mt-2 flex flex-wrap items-center gap-2">
        <input className="input max-w-[12rem]" placeholder="name" value={envName} onChange={(e) => setEnvName(e.target.value)} required />
        <select className="input max-w-[10rem]" value={envKind} onChange={(e) => setEnvKind(e.target.value)}>
          <option value="development">development</option>
          <option value="preview">preview</option>
          <option value="production">production</option>
        </select>
        <button className="btn" type="submit">
          Add environment
        </button>
      </form>

      <h2 className="mt-6">Environment variables</h2>
      <p className="muted">Scope: production. Secrets are stored in Parameter Store and shown as ***.</p>
      <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {envVars.map((v) => (
          <li key={v.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>
              <code className="rounded bg-neutral-100 px-1">{v.key}</code> ={" "}
              <code className="rounded bg-neutral-100 px-1">{v.value}</code>
              {v.isSecret && <span className="badge ml-2 bg-amber-100 text-amber-700">secret</span>}
            </span>
            <button className="btn btn-secondary" onClick={() => api.deleteEnvVar(id, v.key).then(loadEnv)}>
              remove
            </button>
          </li>
        ))}
        {envVars.length === 0 && <li className="muted px-4 py-2">No variables.</li>}
      </ul>
      <form onSubmit={addEnvVar} className="mt-2 flex flex-wrap items-center gap-2">
        <input className="input max-w-[10rem]" placeholder="KEY" value={ek} onChange={(e) => setEk(e.target.value)} required />
        <input className="input max-w-[12rem]" placeholder="value" value={ev} onChange={(e) => setEv(e.target.value)} required />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={eSecret} onChange={(e) => setESecret(e.target.checked)} /> secret
        </label>
        <button className="btn" type="submit">
          Add
        </button>
      </form>
    </main>
  );
}
