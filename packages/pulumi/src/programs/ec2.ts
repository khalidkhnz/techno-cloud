import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { PulumiFn } from "@pulumi/pulumi/automation/index.js";
import { nginxServerBlock } from "@techno-deployer/core";

export interface Ec2ProgramArgs {
  name: string;
  imageUri: string;
  boundaryArn: string;
  instanceType?: string;
  os?: string; // al2023 | al2 | ubuntu24 | ubuntu22 | ubuntu20 | debian12 | debian11 | rocky9 | rhel9 | sles15
  storageGb?: number;
  keyName?: string; // existing EC2 key pair name
  port?: number; // container/app port behind Nginx
  tags?: Record<string, string>;
}

// arm64 for Graviton instance families (t4g, c6g, m6g, …), else x86_64.
function archOf(instanceType: string): "arm64" | "x86_64" {
  return /^[a-z]+\dg[a-z]?\./.test(instanceType) ? "arm64" : "x86_64";
}

// Resolve the latest official AMI for the chosen OS + architecture.
function resolveAmi(os: string, arch: "arm64" | "x86_64") {
  const ubuntuArch = arch === "arm64" ? "arm64" : "amd64";
  const debArch = arch === "arm64" ? "arm64" : "amd64";
  const map: Record<string, { owners: string[]; name: string }> = {
    al2023: { owners: ["amazon"], name: `al2023-ami-*-${arch}` },
    al2: { owners: ["amazon"], name: `amzn2-ami-hvm-*-${arch}-gp2` },
    ubuntu24: { owners: ["099720109477"], name: `ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-${ubuntuArch}-server-*` },
    ubuntu22: { owners: ["099720109477"], name: `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-${ubuntuArch}-server-*` },
    ubuntu20: { owners: ["099720109477"], name: `ubuntu/images/hvm-ssd/ubuntu-focal-20.04-${ubuntuArch}-server-*` },
    debian12: { owners: ["136693071363"], name: `debian-12-${debArch}-*` },
    debian11: { owners: ["136693071363"], name: `debian-11-${debArch}-*` },
    rocky9: { owners: ["792107900819"], name: `Rocky-9-EC2-Base-*-${arch}` },
    rhel9: { owners: ["309956199498"], name: `RHEL-9*_HVM-*-${arch}-*` },
    sles15: { owners: ["013907871322"], name: `suse-sles-15-sp*-v*-hvm-ssd-${arch}` },
  };
  const spec = map[os] ?? map.al2023!;
  return aws.ec2.getAmiOutput({
    mostRecent: true,
    owners: spec.owners,
    filters: [{ name: "name", values: [spec.name] }],
  });
}

/**
 * Deploy program: a single EC2 instance with a stable **Elastic IP**, a security group opening
 * 80/443/22, the selected **key pair**, sized gp3 root storage, and user-data that installs Docker +
 * **Nginx** and reverse-proxies :80 → the app container. Returns the public URL (http://<eip>).
 * One host can serve multiple apps (each app gets its own Nginx server block / instance).
 */
export function ec2Program(args: Ec2ProgramArgs): PulumiFn {
  return async () => {
    const port = args.port ?? 8080;
    const instanceType = args.instanceType ?? "t3.micro";
    const arch = archOf(instanceType);

    const vpc = aws.ec2.getVpcOutput({ default: true });
    const subnets = aws.ec2.getSubnetsOutput({ filters: [{ name: "vpc-id", values: [vpc.id] }] });
    const ami = resolveAmi(args.os ?? "al2023", arch);

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
    // Allow SSM Session Manager (keyless access + Run Command for existing-host deploys).
    new aws.iam.RolePolicyAttachment(`${args.name}-ssm`, {
      role: role.name,
      policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    });
    const profile = new aws.iam.InstanceProfile(args.name, { role: role.name });

    const sg = new aws.ec2.SecurityGroup(args.name, {
      vpcId: vpc.id,
      description: `${args.name} web + ssh`,
      ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"], description: "http" },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"], description: "https" },
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"], description: "ssh" },
      ],
      egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
      tags: args.tags,
    });

    const registry = args.imageUri.split("/")[0];
    const nginxConf = nginxServerBlock({ port });
    const userData = aws.getRegionOutput().name.apply((region) =>
      Buffer.from(
        [
          "#!/bin/bash",
          "set -e",
          "if command -v dnf >/dev/null; then dnf install -y docker nginx awscli;",
          "elif command -v apt-get >/dev/null; then export DEBIAN_FRONTEND=noninteractive; apt-get update && apt-get install -y docker.io nginx awscli;",
          "elif command -v zypper >/dev/null; then zypper -n install docker nginx aws-cli; fi",
          "systemctl enable --now docker nginx",
          `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${registry}`,
          `docker run -d --restart always -p 127.0.0.1:${port}:${port} ${args.imageUri}`,
          "cat > /etc/nginx/conf.d/app.conf <<'NGINX'",
          nginxConf,
          "NGINX",
          "rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true",
          "nginx -t && systemctl reload nginx",
        ].join("\n"),
      ).toString("base64"),
    );

    const instance = new aws.ec2.Instance(args.name, {
      ami: ami.id,
      instanceType,
      iamInstanceProfile: profile.name,
      vpcSecurityGroupIds: [sg.id],
      subnetId: subnets.ids.apply((ids) => ids[0]!),
      ...(args.keyName ? { keyName: args.keyName } : {}),
      rootBlockDevice: { volumeSize: args.storageGb ?? 20, volumeType: "gp3" },
      userDataBase64: userData,
      userDataReplaceOnChange: true,
      tags: { Name: args.name, ...args.tags },
    });

    // Stable public address the deployed URL points at.
    const eip = new aws.ec2.Eip(args.name, {
      instance: instance.id,
      domain: "vpc",
      tags: args.tags,
    });

    return { url: pulumi.interpolate`http://${eip.publicIp}` };
  };
}
