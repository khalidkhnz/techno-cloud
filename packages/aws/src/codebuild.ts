/**
 * CodeBuild trigger. The build worker starts a build with per-deployment env overrides; the
 * build project (provisioned in infra) clones/detects/builds and pushes the image to ECR.
 *
 * SECURITY: never pass `sourceLocationOverride`/`buildspecOverride` from untrusted input — only
 * PLAINTEXT env overrides, validated by the caller. See PHASE1_TODO §6.
 */

import { CodeBuildClient, StartBuildCommand } from "@aws-sdk/client-codebuild";

const region = process.env.AWS_REGION ?? "us-east-1";
const client = new CodeBuildClient({ region });

export async function startBuild(
  projectName: string,
  env: Record<string, string>,
): Promise<string | undefined> {
  if (!projectName) {
    // eslint-disable-next-line no-console
    console.warn("[codebuild] BUILD_PROJECT_NAME not set — skipping StartBuild (local mode).");
    return undefined;
  }
  const res = await client.send(
    new StartBuildCommand({
      projectName,
      environmentVariablesOverride: Object.entries(env).map(([name, value]) => ({
        name,
        value,
        type: "PLAINTEXT" as const,
      })),
    }),
  );
  return res.build?.id;
}
