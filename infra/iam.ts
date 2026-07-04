import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { prefix, tags } from "./config.js";
import { artifactsBucket, idempotencyTable, lockTable, stateBucket } from "./storage.js";
import { buildQueue, deployQueue } from "./queues.js";
import { repository } from "./registry.js";

const assumeRole = (service: string): string =>
  JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: service },
        Action: "sts:AssumeRole",
      },
    ],
  });

/**
 * CodeBuild role — runs image builds AND `pulumi up`. Because Pulumi provisions arbitrary
 * runtime infra (Lambda/Amplify/ECS/etc.), this role is intentionally broad (PowerUserAccess
 * + role management). TODO(phase4-security): scope down per PHASE4_TODO §7.
 */
export const codeBuildRole = new aws.iam.Role("codebuild-role", {
  name: `${prefix}-codebuild`,
  assumeRolePolicy: assumeRole("codebuild.amazonaws.com"),
  tags,
});

new aws.iam.RolePolicyAttachment("codebuild-poweruser", {
  role: codeBuildRole.name,
  policyArn: "arn:aws:iam::aws:policy/PowerUserAccess",
});

// PowerUserAccess excludes IAM; Pulumi needs to manage service roles for the apps it deploys.
new aws.iam.RolePolicy("codebuild-iam", {
  name: "manage-service-roles",
  role: codeBuildRole.id,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:PassRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:TagRole",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
        ],
        Resource: "*",
      },
    ],
  }),
});

/**
 * Lambda execution role — shared by the API + build/deploy worker functions. Grants the
 * minimum the control plane needs: logs, SQS, DynamoDB, S3 artifacts, SSM params, and
 * codebuild:StartBuild (workers trigger builds/Pulumi runs).
 */
export const lambdaRole = new aws.iam.Role("lambda-role", {
  name: `${prefix}-lambda`,
  assumeRolePolicy: assumeRole("lambda.amazonaws.com"),
  tags,
});

new aws.iam.RolePolicyAttachment("lambda-basic-execution", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

new aws.iam.RolePolicy("lambda-inline", {
  name: "control-plane",
  role: lambdaRole.id,
  policy: pulumi
    .all([
      buildQueue.arn,
      deployQueue.arn,
      lockTable.arn,
      idempotencyTable.arn,
      artifactsBucket.arn,
      stateBucket.arn,
      repository.arn,
    ])
    .apply(([buildArn, deployArn, lockArn, idemArn, artifactsArn, stateArn, repoArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "Queues",
            Effect: "Allow",
            Action: [
              "sqs:SendMessage",
              "sqs:ReceiveMessage",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes",
            ],
            Resource: [buildArn, deployArn],
          },
          {
            Sid: "Tables",
            Effect: "Allow",
            Action: [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
              "dynamodb:Query",
            ],
            Resource: [lockArn, idemArn],
          },
          {
            Sid: "Artifacts",
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
            Resource: [artifactsArn, `${artifactsArn}/*`, stateArn, `${stateArn}/*`],
          },
          {
            Sid: "Registry",
            Effect: "Allow",
            Action: [
              "ecr:GetAuthorizationToken",
              "ecr:BatchGetImage",
              "ecr:GetDownloadUrlForLayer",
            ],
            Resource: "*",
          },
          {
            Sid: "Ecr",
            Effect: "Allow",
            Action: ["ecr:DescribeImages", "ecr:ListImages"],
            Resource: repoArn,
          },
          {
            Sid: "Secrets",
            Effect: "Allow",
            Action: ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
            Resource: "*",
          },
          {
            Sid: "TriggerBuilds",
            Effect: "Allow",
            Action: ["codebuild:StartBuild", "codebuild:BatchGetBuilds"],
            Resource: "*",
          },
        ],
      }),
    ),
});
