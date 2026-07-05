import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { nginxServerBlock } from "@techno-deployer/core";
import { runShellOnInstance } from "@techno-deployer/aws";
import { AuthGuard } from "../auth/auth.guard.js";

interface NginxDto {
  instanceId: string;
  port?: number;
  serverName?: string;
  region?: string;
}

/** EC2 helpers for the create flow — read a live instance's Nginx config to diff against the append. */
@UseGuards(AuthGuard)
@Controller("ec2")
export class Ec2Controller {
  @Post("nginx")
  async nginx(@Body() body: NginxDto) {
    const appended = nginxServerBlock({
      port: body.port ?? 8080,
      ...(body.serverName ? { serverName: body.serverName } : {}),
    });

    let current: string | null = null;
    let note: string | undefined;
    if (body.instanceId) {
      current = await runShellOnInstance(
        body.instanceId,
        "cat /etc/nginx/conf.d/*.conf 2>/dev/null || true",
        { region: body.region },
      );
      if (current === null) {
        note =
          "Couldn't read the live config (instance not SSM-managed or no AWS access). The block above will be appended at deploy without touching existing server blocks.";
      }
    }

    return { current, appended, note };
  }
}
