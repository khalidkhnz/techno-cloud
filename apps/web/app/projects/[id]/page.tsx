"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Deployment, type Domain, type EnvVar, type Environment, type Project } from "../../../lib/api";

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

  const [logs, setLogs] = useState<{ timestamp: number; message: string }[] | null>(null);
  const [logDep, setLogDep] = useState<string | null>(null);

  const [doms, setDoms] = useState<Domain[]>([]);
  const [dom, setDom] = useState("");
  const [domInstr, setDomInstr] = useState<{ name: string; value: string } | null>(null);

  const loadEnv = () => api.listEnvVars(id).then(setEnvVars).catch(() => {});
  const loadEnvs = () => api.listEnvironments(id).then(setEnvs).catch(() => {});
  const loadDomains = () => api.listDomains(id).then(setDoms).catch(() => {});

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await api.addDomain(id, dom);
      setDomInstr(r.instructions);
      setDom("");
      loadDomains();
    } catch (e) {
      setError(String(e));
    }
  }

  // Live logs: poll every 3s while open (WebSocket fallback).
  useEffect(() => {
    if (!logDep) {
      setLogs(null);
      return;
    }
    let active = true;
    const poll = () =>
      api
        .getLogs(id, logDep, "build")
        .then((l) => active && setLogs(l))
        .catch(() => {});
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [logDep, id]);

  const load = () => {
    api.getProject(id).then(setProject).catch((e) => setError(String(e)));
    api.listDeployments(id).then(setDeployments).catch((e) => setError(String(e)));
    loadEnv();
    loadEnvs();
    loadDomains();
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
            <button
              className="btn btn-secondary ml-auto"
              onClick={() => setLogDep(logDep === d.id ? null : d.id)}
            >
              {logDep === d.id ? "Stop logs" : "Live logs"}
            </button>
            {d.state === "ready" && (
              <button
                className="btn btn-secondary"
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
      {logDep && (
        <>
          <p className="muted mt-2 flex items-center gap-1">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" /> live · polling every 3s
          </p>
          <pre className="mt-1 max-h-72 overflow-auto rounded-lg border border-neutral-200 bg-neutral-900 p-3 text-xs leading-relaxed text-neutral-100">
            {logs && logs.length ? logs.map((l, i) => <div key={i}>{l.message}</div>) : "Waiting for logs…"}
          </pre>
        </>
      )}

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

      <h2 className="mt-6">Custom domains</h2>
      <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {doms.map((d) => (
          <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>
              {d.hostname}{" "}
              {d.verified ? (
                <span className="badge bg-green-100 text-green-700">verified</span>
              ) : (
                <span className="badge bg-amber-100 text-amber-700">pending</span>
              )}
            </span>
            <span className="flex gap-2">
              {!d.verified && (
                <button className="btn btn-secondary" onClick={() => api.verifyDomain(id, d.id).then(loadDomains)}>
                  verify
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => api.deleteDomain(id, d.id).then(loadDomains)}>
                remove
              </button>
            </span>
          </li>
        ))}
        {doms.length === 0 && <li className="muted px-4 py-2">No custom domains.</li>}
      </ul>
      <form onSubmit={addDomain} className="mt-2 flex flex-wrap items-center gap-2">
        <input className="input max-w-[16rem]" placeholder="app.example.com" value={dom} onChange={(e) => setDom(e.target.value)} required />
        <button className="btn" type="submit">
          Add domain
        </button>
      </form>
      {domInstr && (
        <p className="muted mt-2">
          Add a TXT record <code className="rounded bg-neutral-100 px-1">{domInstr.name}</code> ={" "}
          <code className="rounded bg-neutral-100 px-1">{domInstr.value}</code>, then click verify.
        </p>
      )}

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
