import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { deployments, eq, projects, type Db } from "@techno-deployer/db";
import { fetchLogs, type LogEvent } from "@techno-deployer/aws";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

type Stream = "build" | "runtime";

@Injectable()
export class LogsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async forDeployment(deploymentId: string, stream: Stream): Promise<LogEvent[]> {
    const [deployment] = await this.db
      .select()
      .from(deployments)
      .where(eq(deployments.id, deploymentId));
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    const prefix = process.env.APP_PREFIX ?? "td-dev";
    let group: string;

    if (stream === "build") {
      group = `${prefix}-build`;
    } else {
      const [project] = await this.db
        .select()
        .from(projects)
        .where(eq(projects.id, deployment.projectId));
      group =
        project?.target === "lambda" && deployment.targetRef
          ? `/aws/lambda/${deployment.targetRef}`
          : `${prefix}-deploy`;
    }

    // Last hour, capped — the UI polls this endpoint.
    return fetchLogs(group, { startTime: Date.now() - 3_600_000, limit: 200 });
  }
}
