import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { prefix, tags } from "./config.js";
import { artifactsBucket, idempotencyTable, lockTable } from "./storage.js";
import { buildQueue, deployQueue } from "./queues.js";
import { repository } from "./registry.js";

const accountId = aws.getCallerIdentityOutput().accountId;
const region = aws.getRegionOutput().name;

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
 * Permissions boundary that every Pulumi-created app role MUST carry. It caps what a
 * deployed app's role can ever do — notably it DENIES all IAM/Organizations/account actions,
 * closing the privilege-escalation path (a compromised app role can't mint new roles).
 */
export const appBoundary = new aws.iam.Policy("app-boundary", {
  name: `${prefix}-app-boundary`,
  description: "Permissions boundary for Pulumi-created app roles (no IAM/org escalation).",
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      { Sid: "AllowRuntime", Effect: "Allow", Action: "*", Resource: "*" },
      {
        Sid: "DenyEscalation",
        Effect: "Deny",
        Action: ["iam:*", "organizations:*", "account:*"],
        Resource: "*",
      },
    ],
  }),
  tags,
});

/**
 * CodeBuild role — runs image builds AND `pulumi up`. Provisioning breadth comes from
 * PowerUserAccess (which EXCLUDES iam:*). IAM role management is granted separately and
 * tightly scoped: it can only manage `${prefix}-app-*` roles, only when they carry the
 * permissions boundary above, only PassRole to known services, and can NEVER attach
 * Administrator/PowerUser/IAMFullAccess. TODO(phase4-security): split build vs deploy roles
 * and use per-project STS AssumeRole with external-id (PHASE4 §7).
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

new aws.iam.RolePolicy("codebuild-iam", {
  name: "manage-app-roles",
  role: codeBuildRole.id,
  policy: pulumi.all([accountId, appBoundary.arn]).apply(([acct, boundaryArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "CreateAppRolesWithBoundary",
          Effect: "Allow",
          Action: ["iam:CreateRole", "iam:PutRolePolicy", "iam:AttachRolePolicy", "iam:TagRole"],
          Resource: `arn:aws:iam::${acct}:role/${prefix}-app-*`,
          Condition: { StringEquals: { "iam:PermissionsBoundary": boundaryArn } },
        },
        {
          Sid: "ManageAppRoles",
          Effect: "Allow",
          Action: [
            "iam:DeleteRole",
            "iam:GetRole",
            "iam:DetachRolePolicy",
            "iam:DeleteRolePolicy",
            "iam:ListRolePolicies",
            "iam:ListAttachedRolePolicies",
          ],
          Resource: `arn:aws:iam::${acct}:role/${prefix}-app-*`,
        },
        {
          Sid: "PassAppRolesToServicesOnly",
          Effect: "Allow",
          Action: "iam:PassRole",
          Resource: `arn:aws:iam::${acct}:role/${prefix}-app-*`,
          Condition: {
            StringEquals: {
              "iam:PassedToService": [
                "lambda.amazonaws.com",
                "ecs-tasks.amazonaws.com",
                "apprunner.amazonaws.com",
                "ec2.amazonaws.com",
                "amplify.amazonaws.com",
              ],
            },
          },
        },
        {
          // Belt-and-suspenders: forbid creating any role without the boundary, and forbid
          // ever attaching high-privilege managed policies to a role.
          Sid: "DenyRoleWithoutBoundary",
          Effect: "Deny",
          Action: ["iam:CreateRole", "iam:PutRolePolicy"],
          Resource: "*",
          Condition: { StringNotEquals: { "iam:PermissionsBoundary": boundaryArn } },
        },
        {
          Sid: "DenyPrivilegeEscalation",
          Effect: "Deny",
          Action: "iam:AttachRolePolicy",
          Resource: "*",
          Condition: {
            "ForAnyValue:ArnEquals": {
              "iam:PolicyARN": [
                "arn:aws:iam::aws:policy/AdministratorAccess",
                "arn:aws:iam::aws:policy/PowerUserAccess",
                "arn:aws:iam::aws:policy/IAMFullAccess",
              ],
            },
          },
        },
      ],
    }),
  ),
});

/**
 * Lambda execution role — shared by the API + build/deploy worker functions. Minimum the
 * control plane needs: logs, SQS, DynamoDB, artifacts S3 (NOT the Pulumi state bucket — only
 * CodeBuild touches state), SSM params, and StartBuild scoped to this stack's projects.
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
      repository.arn,
      accountId,
      region,
    ])
    .apply(([buildArn, deployArn, lockArn, idemArn, artifactsArn, repoArn, acct, reg]) =>
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
            Sid: "ArtifactsObjects",
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:PutObject"],
            Resource: [`${artifactsArn}/*`],
          },
          {
            Sid: "ArtifactsList",
            Effect: "Allow",
            Action: ["s3:ListBucket"],
            Resource: [artifactsArn],
          },
          {
            Sid: "RegistryAuth",
            Effect: "Allow",
            Action: ["ecr:GetAuthorizationToken"],
            Resource: "*",
          },
          {
            Sid: "Registry",
            Effect: "Allow",
            Action: [
              "ecr:DescribeImages",
              "ecr:ListImages",
              "ecr:BatchGetImage",
              "ecr:GetDownloadUrlForLayer",
            ],
            Resource: repoArn,
          },
          {
            Sid: "Secrets",
            Effect: "Allow",
            Action: ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
            Resource: `arn:aws:ssm:${reg}:${acct}:parameter/${prefix}/*`,
          },
          {
            Sid: "TriggerBuilds",
            Effect: "Allow",
            Action: ["codebuild:StartBuild", "codebuild:BatchGetBuilds"],
            Resource: `arn:aws:codebuild:${reg}:${acct}:project/${prefix}-*`,
          },
        ],
      }),
    ),
});
