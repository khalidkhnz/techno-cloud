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

/** Requires a session whose email maps to a domain user with an owner/admin team role. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const result = await getSession(req);
    if (!result?.session) throw new UnauthorizedException();

    const [domainUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, result.user.email));
    if (!domainUser) throw new ForbiddenException("No domain account");

    const memberships = await this.db
      .select()
      .from(teamMemberships)
      .where(eq(teamMemberships.userId, domainUser.id));
    const isAdmin = memberships.some((m) => m.role === "owner" || m.role === "admin");
    if (!isAdmin) throw new ForbiddenException("Admin only");

    req.authUser = { id: result.user.id, email: result.user.email };
    return true;
  }
}
