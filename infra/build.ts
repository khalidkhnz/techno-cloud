import * as aws from "@pulumi/aws";
import { prefix, tags } from "./config.js";
import { codeBuildRole } from "./iam.js";
import { repository } from "./registry.js";

/**
 * Build farm — a single reusable CodeBuild project (arm64) that the build worker triggers with
 * per-deployment env overrides (CLONE_URL, SOURCE_REF, DEPLOYMENT_ID). It clones the source,
 * builds an image (Dockerfile-first, Nixpacks fallback), and pushes to ECR tagged by deploymentId.
 *
 * SECURITY: only PLAINTEXT env overrides are accepted at StartBuild (no source/buildspec override).
 */
const buildspec = `version: 0.2
phases:
  pre_build:
    commands:
      - echo "Logging in to ECR..."
      - aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
      - echo "Cloning $CLONE_URL (ref \${SOURCE_REF:-main})"
      - git clone --depth 1 --branch "\${SOURCE_REF:-main}" "$CLONE_URL" src || git clone --depth 1 "$CLONE_URL" src
  build:
    commands:
      - cd src
      - IMAGE="$ECR_REGISTRY:$DEPLOYMENT_ID"
      - |
        if [ -f Dockerfile ]; then
          echo "Dockerfile found — building with docker (BuildKit inline cache)";
          export DOCKER_BUILDKIT=1;
          docker pull "$ECR_REGISTRY:cache" || true;
          docker build -t "$IMAGE" --cache-from "$ECR_REGISTRY:cache" --build-arg BUILDKIT_INLINE_CACHE=1 .;
          docker tag "$IMAGE" "$ECR_REGISTRY:cache";
        else
          echo "No Dockerfile — building with Nixpacks";
          curl -sSL https://nixpacks.com/install.sh | bash;
          nixpacks build . --name "$IMAGE";
        fi
      - docker push "$IMAGE"
      - docker push "$ECR_REGISTRY:cache" || true
  post_build:
    commands:
      - echo "Pushed $IMAGE"
`;

export const buildProject = new aws.codebuild.Project("build", {
  name: `${prefix}-build`,
  serviceRole: codeBuildRole.arn,
  artifacts: { type: "NO_ARTIFACTS" },
  environment: {
    computeType: "BUILD_GENERAL1_SMALL",
    image: "aws/codebuild/amazonlinux2-aarch64-standard:3.0",
    type: "ARM_CONTAINER",
    privilegedMode: true, // required for `docker build`
    environmentVariables: [{ name: "ECR_REGISTRY", value: repository.repositoryUrl }],
  },
  source: { type: "NO_SOURCE", buildspec },
  logsConfig: { cloudwatchLogs: { status: "ENABLED", groupName: `${prefix}-build` } },
  tags,
});
