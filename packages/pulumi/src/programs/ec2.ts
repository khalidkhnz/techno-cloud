import * as aws from "@pulumi/aws";
import type { PulumiFn } from "@pulumi/pulumi/automation/index.js";

export interface Ec2ProgramArgs {
  name: string;
  imageUri: string;
  boundaryArn: string;
  instanceType?: string;
  port?: number;
}

/**
 * Deploy program: an arm64 EC2 auto-scaling group (min/max 1) running the container via user-data.
 * For opt-in special workloads (GPU/licensed). URL wiring via ALB is deferred (returns empty url).
 */
export function ec2Program(args: Ec2ProgramArgs): PulumiFn {
  return async () => {
    const port = args.port ?? 8080;
    const vpc = aws.ec2.getVpcOutput({ default: true });
    const subnets = aws.ec2.getSubnetsOutput({ filters: [{ name: "vpc-id", values: [vpc.id] }] });
    const ami = aws.ec2.getAmiOutput({
      mostRecent: true,
      owners: ["amazon"],
      filters: [{ name: "name", values: ["al2023-ami-*-arm64"] }],
    });

    const role = new aws.iam.Role(`${args.name}-role`, {
      name: `${args.name}-role`,
      permissionsBoundary: args.boundaryArn,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          { Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" },
        ],
      }),
    });
    new aws.iam.RolePolicyAttachment(`${args.name}-ecr`, {
      role: role.name,
      policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    });
    const profile = new aws.iam.InstanceProfile(args.name, { role: role.name });

    const sg = new aws.ec2.SecurityGroup(args.name, {
      vpcId: vpc.id,
      ingress: [{ protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] }],
      egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
    });

    const userData = aws
      .getRegionOutput()
      .name.apply((region) =>
        Buffer.from(
          [
            "#!/bin/bash",
            "set -e",
            "dnf install -y docker && systemctl enable --now docker",
            `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${args.imageUri.split("/")[0]}`,
            `docker run -d -p 80:${port} ${args.imageUri}`,
          ].join("\n"),
        ).toString("base64"),
      );

    const lt = new aws.ec2.LaunchTemplate(args.name, {
      namePrefix: `${args.name}-`,
      imageId: ami.id,
      instanceType: args.instanceType ?? "t4g.small",
      iamInstanceProfile: { arn: profile.arn },
      vpcSecurityGroupIds: [sg.id],
      userData,
    });

    new aws.autoscaling.Group(args.name, {
      desiredCapacity: 1,
      minSize: 1,
      maxSize: 1,
      vpcZoneIdentifiers: subnets.ids,
      launchTemplate: { id: lt.id, version: "$Latest" },
    });

    return { url: "" };
  };
}
