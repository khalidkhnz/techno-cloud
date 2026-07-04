import { randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  and,
  eq,
  inArray,
  invites,
  teamMemberships,
  teams,
  users,
  type Db,
} from "@techno-deployer/db";
import { env } from "@techno-deployer/env";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { teamIdsForEmail } from "../auth/auth.guard.js";
import { sendInviteEmail } from "../auth/mailer.js";

type Role = "owner" | "admin" | "developer" | "viewer";

@Injectable()
export class TeamsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async domainUser(email: string) {
    const [u] = await this.db.select().from(users).where(eq(users.email, email));
    return u;
  }

  /** Create a team; the caller becomes its owner. */
  async create(email: string, name: string) {
    const user = await this.domainUser(email);
    if (!user) throw new BadRequestException("No domain account for caller");
    const [team] = await this.db.insert(teams).values({ name }).returning();
    if (!team) throw new Error("Failed to create team");
    await this.db.insert(teamMemberships).values({ teamId: team.id, userId: user.id, role: "owner" });
    return team;
  }

  /** Teams the caller belongs to. */
  async list(email: string) {
    const ids = await teamIdsForEmail(this.db, email);
    if (ids.length === 0) return [];
    return this.db.select().from(teams).where(inArray(teams.id, ids));
  }

  async members(teamId: string) {
    const rows = await this.db
      .select({
        userId: teamMemberships.userId,
        role: teamMemberships.role,
        email: users.email,
        name: users.name,
      })
      .from(teamMemberships)
      .innerJoin(users, eq(users.id, teamMemberships.userId))
      .where(eq(teamMemberships.teamId, teamId));
    return rows;
  }

  /** Add a member: direct membership if the user exists, else email an invite with the role. */
  async addMember(teamId: string, email: string, role: Role = "developer") {
    const user = await this.domainUser(email);
    if (user) {
      const existing = await this.db
        .select()
        .from(teamMemberships)
        .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, user.id)));
      if (existing.length > 0) return { added: false as const, reason: "already a member" };
      await this.db.insert(teamMemberships).values({ teamId, userId: user.id, role });
      return { added: true as const };
    }

    const token = randomUUID();
    await this.db.insert(invites).values({ email, teamId, role, token });
    const origin = env.APP_ORIGIN ?? "http://localhost:3000";
    await sendInviteEmail(email, `${origin}/accept-invite?token=${token}`).catch(() => {});
    return { invited: true as const };
  }

  async updateRole(teamId: string, userId: string, role: Role) {
    await this.db
      .update(teamMemberships)
      .set({ role })
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)));
    return { ok: true as const };
  }

  async removeMember(teamId: string, userId: string) {
    await this.db
      .delete(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)));
    return { ok: true as const };
  }
}
