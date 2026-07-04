import * as aws from "@pulumi/aws";
import { prefix, tags } from "./config.js";

/**
 * ECR registry for built container images. Scan-on-push enabled; a lifecycle policy
 * expires untagged images after 14 days to control storage cost ($0.10/GB-mo).
 */
export const repository = new aws.ecr.Repository("images", {
  name: `${prefix}-images`,
  imageTagMutability: "MUTABLE",
  imageScanningConfiguration: { scanOnPush: true },
  forceDelete: true,
  tags,
});

new aws.ecr.LifecyclePolicy("images-lifecycle", {
  repository: repository.name,
  policy: JSON.stringify({
    rules: [
      {
        rulePriority: 1,
        description: "Expire untagged images after 14 days",
        selection: {
          tagStatus: "untagged",
          countType: "sinceImagePushed",
          countUnit: "days",
          countNumber: 14,
        },
        action: { type: "expire" },
      },
    ],
  }),
});
