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
  createProject: (body: {
    teamId: string;
    name: string;
    target?: string;
    source: unknown;
    buildConfig?: { installCommand?: string; buildCommand?: string; startCommand?: string };
    notifyEmail?: string;
  }) => req<Project>("/projects", { method: "POST", body: JSON.stringify(body) }),
  listDeployments: (projectId: string) =>
    req<Deployment[]>(`/projects/${projectId}/deployments`),
  createDeployment: (projectId: string) =>
    req<Deployment>(`/projects/${projectId}/deployments`, { method: "POST" }),
  rollbackDeployment: (projectId: string, deploymentId: string) =>
    req<Deployment>(`/projects/${projectId}/deployments/${deploymentId}/rollback`, {
      method: "POST",
    }),
  getLogs: (projectId: string, deploymentId: string, stream: "build" | "runtime" = "build") =>
    req<{ timestamp: number; message: string }[]>(
      `/projects/${projectId}/deployments/${deploymentId}/logs?stream=${stream}`,
    ),
  acceptInvite: (token: string) =>
    req<{ ok: boolean; email?: string }>(`/invites/accept?token=${encodeURIComponent(token)}`, {
      method: "POST",
    }),
  createInvite: (body: { email: string; teamId: string; role?: string }) =>
    req<{ id: string; email: string }>("/invites", { method: "POST", body: JSON.stringify(body) }),
  getEstimates: () =>
    req<Record<string, { monthlyLowUsd: number; monthlyHighUsd: number }>>("/estimates"),
  getPlatformConfig: () => req<PlatformConfig>("/platform-config"),
  getMeters: () => req<FreeTierMeter[]>("/meters"),
  getAudit: () => req<AuditLog[]>("/audit"),
  listEnvironments: (projectId: string) =>
    req<Environment[]>(`/projects/${projectId}/environments`),
  createEnvironment: (projectId: string, body: { kind: string; name: string }) =>
    req<Environment>(`/projects/${projectId}/environments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteEnvironment: (projectId: string, environmentId: string) =>
    req<{ ok: boolean }>(`/projects/${projectId}/environments/${environmentId}`, {
      method: "DELETE",
    }),
  listDomains: (projectId: string) => req<Domain[]>(`/projects/${projectId}/domains`),
  addDomain: (projectId: string, hostname: string) =>
    req<{ domain: Domain; instructions: { type: string; name: string; value: string } }>(
      `/projects/${projectId}/domains`,
      { method: "POST", body: JSON.stringify({ hostname }) },
    ),
  verifyDomain: (projectId: string, domainId: string) =>
    req<{ verified: boolean }>(`/projects/${projectId}/domains/${domainId}/verify`, {
      method: "POST",
    }),
  deleteDomain: (projectId: string, domainId: string) =>
    req<{ ok: boolean }>(`/projects/${projectId}/domains/${domainId}`, { method: "DELETE" }),
  listEnvVars: (projectId: string) =>
    req<EnvVar[]>(`/projects/${projectId}/env?scope=production`),
  upsertEnvVar: (projectId: string, body: { key: string; value: string; isSecret: boolean }) =>
    req<EnvVar>(`/projects/${projectId}/env`, {
      method: "PUT",
      body: JSON.stringify({ ...body, scope: "production" }),
    }),
  deleteEnvVar: (projectId: string, key: string) =>
    req<{ ok: boolean }>(
      `/projects/${projectId}/env?scope=production&key=${encodeURIComponent(key)}`,
      { method: "DELETE" },
    ),
};

export interface EnvVar {
  id: string;
  scope: string;
  key: string;
  isSecret: boolean;
  value: string;
}

export interface PlatformConfig {
  targets: Record<string, boolean>;
  routing: { subdomains: boolean; customDomains: boolean; previews: boolean };
  limits: { maxConcurrentBuilds: number; previewTtlHours: number; maxAppsPerTeam: number };
}

/** target kind → PlatformConfig.targets flag key */
export const TARGET_FLAG: Record<string, string> = {
  lambda: "lambda",
  amplify: "amplify",
  "static-cdn": "staticCdn",
  apprunner: "appRunner",
  "ecs-fargate": "ecsFargate",
  ec2: "ec2",
};

export const ALWAYS_ON_TARGETS = ["apprunner", "ecs-fargate", "ec2"];

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  meta: { actorEmail?: string | null } | null;
  createdAt: string;
}

export interface Environment {
  id: string;
  projectId: string;
  kind: string;
  name: string;
}

export interface Domain {
  id: string;
  projectId: string;
  hostname: string;
  verifyToken: string;
  verified: boolean;
}

export interface FreeTierMeter {
  service: string;
  metric: string;
  limit: number;
  unit: string;
  window: string;
  used: number;
  pct: number;
  status: "ok" | "warn" | "alert" | "exceeded";
}
