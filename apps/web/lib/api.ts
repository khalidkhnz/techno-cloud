/** Minimal typed client for the control-plane API. Base URL from validated env. */

import { env } from "../env";

export interface Project {
  id: string;
  teamId: string;
  name: string;
  target: string;
  source: unknown;
  createdAt: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  environmentId: string;
  state: "queued" | "building" | "deploying" | "ready" | "failed" | "destroyed";
  url: string | null;
  createdAt: string;
}

const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    credentials: "include", // send the Better Auth session cookie to guarded routes
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const api = {
  listProjects: () => req<Project[]>("/projects"),
  getProject: (id: string) => req<Project>(`/projects/${id}`),
  createProject: (body: { teamId: string; name: string; target?: string; source: unknown }) =>
    req<Project>("/projects", { method: "POST", body: JSON.stringify(body) }),
  listDeployments: (projectId: string) =>
    req<Deployment[]>(`/projects/${projectId}/deployments`),
  createDeployment: (projectId: string) =>
    req<Deployment>(`/projects/${projectId}/deployments`, { method: "POST" }),
  acceptInvite: (token: string) =>
    req<{ ok: boolean; email?: string }>(`/invites/accept?token=${encodeURIComponent(token)}`, {
      method: "POST",
    }),
  createInvite: (body: { email: string; teamId: string; role?: string }) =>
    req<{ id: string; email: string }>("/invites", { method: "POST", body: JSON.stringify(body) }),
  getEstimates: () =>
    req<Record<string, { monthlyLowUsd: number; monthlyHighUsd: number }>>("/estimates"),
};
