import { Inject, Injectable } from "@nestjs/common";
import { and, envVars, eq, type Db } from "@techno-deployer/db";
import { deleteSecret, putSecret } from "@techno-deployer/aws";
import { DRIZZLE } from "../drizzle/drizzle.module.js";

type Scope = "production" | "preview" | "development";

export interface UpsertEnvVarDto {
  scope?: Scope;
  key: string;
  value: string;
  isSecret?: boolean;
}

@Injectable()
export class EnvVarsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Lists vars for a project/scope. Secret values are never returned — masked as "***". */
  async list(projectId: string, scope: Scope = "production") {
    const rows = await this.db
      .select()
      .from(envVars)
      .where(and(eq(envVars.projectId, projectId), eq(envVars.scope, scope)));
    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      key: r.key,
      isSecret: r.isSecret,
      value: r.isSecret ? "***" : r.value,
    }));
  }

  /** Upsert a var. Secrets go to Parameter Store (path stored); plain values stored inline. */
  async upsert(projectId: string, dto: UpsertEnvVarDto) {
    const scope = dto.scope ?? "production";
    const isSecret = dto.isSecret ?? false;

    // Remove any existing entry for (project, scope, key), cleaning up its SSM param if secret.
    const [existing] = await this.db
      .select()
      .from(envVars)
      .where(
        and(eq(envVars.projectId, projectId), eq(envVars.scope, scope), eq(envVars.key, dto.key)),
      );
    if (existing) {
      if (existing.isSecret) await deleteSecret(existing.value).catch(() => {});
      await this.db.delete(envVars).where(eq(envVars.id, existing.id));
    }

    const stored = isSecret
      ? await putSecret(`${projectId}/${scope}/${dto.key}`, dto.value)
      : dto.value;

    const [row] = await this.db
      .insert(envVars)
      .values({ projectId, scope, key: dto.key, value: stored, isSecret })
      .returning();
    return { id: row?.id, scope, key: dto.key, isSecret, value: isSecret ? "***" : dto.value };
  }

  async remove(projectId: string, scope: Scope, key: string) {
    const [existing] = await this.db
      .select()
      .from(envVars)
      .where(and(eq(envVars.projectId, projectId), eq(envVars.scope, scope), eq(envVars.key, key)));
    if (!existing) return { ok: false as const };
    if (existing.isSecret) await deleteSecret(existing.value).catch(() => {});
    await this.db.delete(envVars).where(eq(envVars.id, existing.id));
    return { ok: true as const };
  }
}
