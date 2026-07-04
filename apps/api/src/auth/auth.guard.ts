import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { eq, teamMemberships, users, type Db } from "@techno-deployer/db";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { getSession } from "./session.js";

type AuthedRequest = Request & { authUser?: { id: string; email: string } };

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
