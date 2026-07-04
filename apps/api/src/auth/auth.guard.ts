import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { and, eq, projects, teamMemberships, users, type Db } from "@techno-deployer/db";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { getSession } from "./session.js";

type AuthedRequest = Request & {
  authUser?: { id: string; email: string };
  params: Record<string, string | undefined>;
};

/** Team ids the given email (domain user) belongs to. */
export async function teamIdsForEmail(db: Db, email: string): Promise<string[]> {
  const [domainUser] = await db.select().from(users).where(eq(users.email, email));
  if (!domainUser) return [];
  const memberships = await db
    .select()
    .from(teamMemberships)
    .where(eq(teamMemberships.userId, domainUser.id));
  return memberships.map((m) => m.teamId);
}

/** Requires a valid Better Auth session; attaches the auth user to the request. */
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const result = await getSession(req);
    if (!result?.session) throw new UnauthorizedException();
    req.authUser = { id: result.user.id, email: result.user.email };
    return true;
  }
}

/** Resolves the caller's team roles, throwing if unauthenticated / no domain account. */
async function requireRoles(
  db: Db,
  req: AuthedRequest,
  allowed: ReadonlyArray<"owner" | "admin" | "developer" | "viewer">,
  label: string,
): Promise<void> {
  const result = await getSession(req);
  if (!result?.session) throw new UnauthorizedException();

  const [domainUser] = await db.select().from(users).where(eq(users.email, result.user.email));
  if (!domainUser) throw new ForbiddenException("No domain account");

  const memberships = await db
    .select()
    .from(teamMemberships)
    .where(eq(teamMemberships.userId, domainUser.id));
  if (!memberships.some((m) => allowed.includes(m.role))) {
    throw new ForbiddenException(`${label} only`);
  }
  req.authUser = { id: result.user.id, email: result.user.email };
}

/**
 * Requires a session AND that the caller is a member of the target project's team. Reads the
 * project id from `:projectId` (sub-resources) or `:id` (the project itself). Prevents IDOR /
 * cross-tenant access to any project-scoped route.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const result = await getSession(req);
    if (!result?.session) throw new UnauthorizedException();

    const projectId = req.params.projectId ?? req.params.id;
    if (!projectId) throw new ForbiddenException("Missing project id");

    const teams = await teamIdsForEmail(this.db, result.user.email);
    const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
    if (!project || !teams.includes(project.teamId)) {
      throw new ForbiddenException("Not a member of this project's team");
    }
    req.authUser = { id: result.user.id, email: result.user.email };
    return true;
  }
}

/** Requires an owner/admin team role. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    await requireRoles(this.db, ctx.switchToHttp().getRequest<AuthedRequest>(), ["owner", "admin"], "Admin");
    return true;
  }
}

/**
 * Requires the owner role. Used for platform-wide, cross-team surfaces (e.g. the audit log)
 * that shouldn't be exposed to every team admin.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    await requireRoles(this.db, ctx.switchToHttp().getRequest<AuthedRequest>(), ["owner"], "Owner");
    return true;
  }
}

/** Requires the caller to be an owner/admin of the target team (`:teamId`). */
@Injectable()
export class TeamAdminGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const result = await getSession(req);
    if (!result?.session) throw new UnauthorizedException();

    const teamId = req.params.teamId;
    if (!teamId) throw new ForbiddenException("Missing team id");

    const [domainUser] = await this.db.select().from(users).where(eq(users.email, result.user.email));
    if (!domainUser) throw new ForbiddenException("No domain account");

    const memberships = await this.db
      .select()
      .from(teamMemberships)
      .where(and(eq(teamMemberships.userId, domainUser.id), eq(teamMemberships.teamId, teamId)));
    if (!memberships.some((m) => m.role === "owner" || m.role === "admin")) {
      throw new ForbiddenException("Team admin only");
    }
    req.authUser = { id: result.user.id, email: result.user.email };
    return true;
  }
}
