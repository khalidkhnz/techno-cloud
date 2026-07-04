/**
 * Pulumi Automation API wrapper. Runs INSIDE a CodeBuild job (not Lambda) to avoid the
 * 15-min limit. State: self-managed S3 backend; locks: DynamoDB. See PLAN.md §5.
 *
 * One stack per `project:environment`. Stubbed — real inline programs land per target in Phase 1.
 */

export interface StackRef {
  project: string;
  environment: string;
  stackName: string; // `${project}:${environment}`
}

export interface UpResult {
  outputs: Record<string, unknown>;
  summary: string;
}

export interface PulumiRunner {
  up(ref: StackRef, program: () => Promise<Record<string, unknown>>): Promise<UpResult>;
  destroy(ref: StackRef): Promise<void>;
  preview(ref: StackRef): Promise<{ hasChanges: boolean }>;
}

export function stackName(project: string, environment: string): string {
  return `${project}:${environment}`;
}

/**
 * Placeholder runner. The real implementation uses `@pulumi/pulumi/automation`
 * (LocalWorkspace.createOrSelectStack) with the S3 backend configured via
 * PULUMI_BACKEND_URL and DynamoDB-based locking.
 */
export class CodeBuildPulumiRunner implements PulumiRunner {
  async up(): Promise<UpResult> {
    throw new Error("CodeBuildPulumiRunner.up not implemented");
  }
  async destroy(): Promise<void> {
    throw new Error("CodeBuildPulumiRunner.destroy not implemented");
  }
  async preview(): Promise<{ hasChanges: boolean }> {
    throw new Error("CodeBuildPulumiRunner.preview not implemented");
  }
}
