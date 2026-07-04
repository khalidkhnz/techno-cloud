/**
 * Platform infrastructure (Pulumi). Provisions the serverless control-plane backbone:
 *   S3 (Pulumi state, artifacts) · DynamoDB (stack locks, idempotency) · SQS (build/deploy queues)
 *   ECR · Route 53 zone · ACM wildcard cert · IAM roles (CodeBuild, build/deploy Lambdas, Pulumi)
 * No NAT Gateway, no ALB, no RDS, no Redis. See PHASE1_TODO.md §10.
 *
 * Stubbed — real resources land in Phase 1.
 */

export const platform = {
  note: "Phase 1: provision S3, DynamoDB, SQS, ECR, Route53, ACM, IAM.",
};
