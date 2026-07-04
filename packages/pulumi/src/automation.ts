/**
 * Pulumi Automation API runner. Executes an inline program against the self-managed S3 backend.
 * Intended to run INSIDE a CodeBuild job (where the pulumi CLI is available) — the deploy worker
 * triggers that job. One stack per `project:environment`. See PLAN.md §5.
 */

import { LocalWorkspace, type PulumiFn } from "@pulumi/pulumi/automation/index.js";

const PROJECT_NAME = "techno-deployer-apps";

export function stackName(project: string, environment: string): string {
  return `${project}-${environment}`;
}

export interface RunOptions {
  stackName: string;
  program: PulumiFn;
  destroy?: boolean;
  /** Run `pulumi preview` instead of `up` — reports pending changes (drift) without applying. */
  preview?: boolean;
}

export interface RunResult {
  outputs: Record<string, unknown>;
  /** Number of non-`same` resource changes (preview: pending; up: applied). */
  changes: number;
}

function countChanges(summary: Record<string, number> | undefined): number {
  return Object.entries(summary ?? {})
    .filter(([op]) => op !== "same")
    .reduce((sum, [, n]) => sum + (n ?? 0), 0);
}

/** Runs `pulumi up`/`preview`/`destroy` for an inline program and returns outputs + change count. */
export async function runStack(opts: RunOptions): Promise<RunResult> {
  const stack = await LocalWorkspace.createOrSelectStack(
    { stackName: opts.stackName, projectName: PROJECT_NAME, program: opts.program },
    {
      envVars: { PULUMI_CONFIG_PASSPHRASE: process.env.PULUMI_CONFIG_PASSPHRASE ?? "" },
      projectSettings: {
        name: PROJECT_NAME,
        runtime: "nodejs",
        backend: { url: process.env.PULUMI_BACKEND_URL ?? "" },
      },
    },
  );

  if (opts.destroy) {
    await stack.destroy({ onOutput: () => undefined });
    return { outputs: {}, changes: 0 };
  }

  if (opts.preview) {
    const pre = await stack.preview({ onOutput: () => undefined });
    return { outputs: {}, changes: countChanges(pre.changeSummary) };
  }

  const result = await stack.up({ onOutput: () => undefined });
  const outputs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result.outputs)) {
    outputs[key] = value.value;
  }
  return { outputs, changes: countChanges(result.summary.resourceChanges) };
}
