import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { PulumiFn } from "@pulumi/pulumi/automation/index.js";

export interface EcsFargateProgramArgs {
  name: string;
  imageUri: string;
  boundaryArn: string;
  port?: number;
  cpu?: string;
  memory?: string;
  env?: Record<string, string>;
}

/**
 * Deploy program: an arm64 Fargate service behind an ALB in the default VPC (always-on). Uses the
 * account's default VPC/subnets to avoid standing up bespoke networking for opt-in container apps.
 */
export function ecsFargateProgram(args: EcsFargateProgramArgs): PulumiFn {
  return async () => {
    const port = args.port ?? 8080;
    const vpc = aws.ec2.getVpcOutput({ default: true });
    const subnets = aws.ec2.getSubnetsOutput({
      filters: [{ name: "vpc-id", values: [vpc.id] }],
    });

    const execRole = new aws.iam.Role(`${args.name}-exec`, {
      name: `${args.name}-exec`,
      permissionsBoundary: args.boundaryArn,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          { Effect: "Allow", Principal: { Service: "ecs-tasks.amazonaws.com" }, Action: "sts:AssumeRole" },
        ],
      }),
    });
    new aws.iam.RolePolicyAttachment(`${args.name}-exec-policy`, {
      role: execRole.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    const albSg = new aws.ec2.SecurityGroup(`${args.name}-alb`, {
      vpcId: vpc.id,
      ingress: [{ protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] }],
      egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
    });
    const svcSg = new aws.ec2.SecurityGroup(`${args.name}-svc`, {
      vpcId: vpc.id,
      ingress: [{ protocol: "tcp", fromPort: port, toPort: port, securityGroups: [albSg.id] }],
      egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
    });

    const alb = new aws.lb.LoadBalancer(args.name, {
      loadBalancerType: "application",
      securityGroups: [albSg.id],
      subnets: subnets.ids,
    });
    const tg = new aws.lb.TargetGroup(args.name, {
      port,
      protocol: "HTTP",
      targetType: "ip",
      vpcId: vpc.id,
      healthCheck: { path: "/" },
    });
    const listener = new aws.lb.Listener(args.name, {
      loadBalancerArn: alb.arn,
      port: 80,
      protocol: "HTTP",
      defaultActions: [{ type: "forward", targetGroupArn: tg.arn }],
    });

    const cluster = new aws.ecs.Cluster(args.name, { name: args.name });

    const taskDef = new aws.ecs.TaskDefinition(args.name, {
      family: args.name,
      cpu: args.cpu ?? "256",
      memory: args.memory ?? "512",
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      runtimePlatform: { cpuArchitecture: "ARM64", operatingSystemFamily: "LINUX" },
      executionRoleArn: execRole.arn,
      containerDefinitions: pulumi.jsonStringify([
        {
          name: args.name,
          image: args.imageUri,
          portMappings: [{ containerPort: port }],
          environment: args.env
            ? Object.entries(args.env).map(([k, v]) => ({ name: k, value: v }))
            : [],
        },
      ]),
    });

    new aws.ecs.Service(
      args.name,
      {
        name: args.name,
        cluster: cluster.arn,
        desiredCount: 1,
        launchType: "FARGATE",
        taskDefinition: taskDef.arn,
        networkConfiguration: {
          subnets: subnets.ids,
          securityGroups: [svcSg.id],
          assignPublicIp: true,
        },
        loadBalancers: [{ targetGroupArn: tg.arn, containerName: args.name, containerPort: port }],
      },
      { dependsOn: [listener] },
    );

    return { url: pulumi.interpolate`http://${alb.dnsName}` };
  };
}
