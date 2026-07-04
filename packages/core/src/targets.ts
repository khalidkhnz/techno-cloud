/**
 * DeployTarget — the pluggable runtime driver interface. One implementation per AWS
 * runtime (lambda, amplify, static-cdn, apprunner, ecs-fargate, ec2). Adding a new
 * runtime = adding a driver; no core changes. See PLAN.md §4.
 */

import type { DeployTargetKind } from "./config.js";
import type { CostEstimate } from "./cost.js";
import type {
  DeployContext,
  DeployOptions,
  DeployResult,
  DeploymentStatus,
  LogLine,
} from "./domain.js";

/** Config a driver needs to price/provision a deployment. */
export interface TargetConfig {
  kind: DeployTargetKind;
  vcpu?: number;
  memoryMb?: number;
  instanceType?: string; // EC2
  alwaysOn?: boolean;
  expectedRequestsPerMonth?: number;
  storageGb?: number;
}

export interface DeployTarget {
  readonly kind: DeployTargetKind;
  /** 'repo' = the driver hands the repo to a managed builder (Amplify). */
  readonly artifactType: "image" | "zip" | "static" | "repo";

  deploy(ctx: DeployContext, opts?: DeployOptions): Promise<DeployResult>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  streamLogs(deploymentId: string): AsyncIterable<LogLine>;
  rollback(toDeploymentId: string): Promise<void>;
  destroy(deploymentId: string): Promise<void>;
  estimateCost(config: TargetConfig): CostEstimate;
}

/** Runtime registry: resolve a driver by kind. */
export class DeployTargetRegistry {
  private readonly drivers = new Map<DeployTargetKind, DeployTarget>();

  register(driver: DeployTarget): void {
    this.drivers.set(driver.kind, driver);
  }

  get(kind: DeployTargetKind): DeployTarget {
    const driver = this.drivers.get(kind);
    if (!driver) throw new Error(`No DeployTarget registered for kind "${kind}"`);
    return driver;
  }

  has(kind: DeployTargetKind): boolean {
    return this.drivers.has(kind);
  }
}
