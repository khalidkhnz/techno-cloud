/** Typed query-key factory — single source of truth for cache keys + invalidation. */
export const qk = {
  projects: {
    all: ["projects"] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  deployments: (projectId: string) => ["projects", projectId, "deployments"] as const,
  logs: (projectId: string, deploymentId: string, stream: string) =>
    ["projects", projectId, "deployments", deploymentId, "logs", stream] as const,
  environments: (projectId: string) => ["projects", projectId, "environments"] as const,
  envVars: (projectId: string) => ["projects", projectId, "env"] as const,
  domains: (projectId: string) => ["projects", projectId, "domains"] as const,
  teams: {
    all: ["teams"] as const,
    members: (teamId: string) => ["teams", teamId, "members"] as const,
  },
  costs: {
    meters: ["costs", "meters"] as const,
    meterAlerts: ["costs", "meterAlerts"] as const,
    snapshots: ["costs", "snapshots"] as const,
    advice: ["costs", "advice"] as const,
    budgets: ["costs", "budgets"] as const,
    estimates: ["costs", "estimates"] as const,
  },
  audit: (action?: string) => ["audit", action ?? "all"] as const,
  platformConfig: ["platform-config"] as const,
  invites: ["invites"] as const,
} as const;
