import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { eq, invites, type Db } from "@techno-deployer/db";
import { env } from "@techno-deployer/env";
import { DRIZZLE } from "../drizzle/drizzle.module.js";
import { sendInviteEmail } from "../auth/mailer.js";

export interface CreateInviteDto {
  email: string;
  teamId: string;
  role?: "owner" | "admin" | "developer" | "viewer";
}

@Injectable()
export class InvitesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async list() {
    return this.db.select().from(invites);
  }

  /** Creates a pending invite and emails an accept link. Enforced by the auth create hook. */
  async create(dto: CreateInviteDto) {
    const token = randomUUID();
    const [invite] = await this.db
      .insert(invites)
      .values({ email: dto.email, teamId: dto.teamId, role: dto.role ?? "developer", token })
      .returning();

    const origin = env.APP_ORIGIN ?? "http://localhost:3000";
    await sendInviteEmail(dto.email, `${origin}/accept-invite?token=${token}`);
    return invite;
  }

  async accept(token: string) {
    const [invite] = await this.db.select().from(invites).where(eq(invites.token, token));
    if (!invite) return { ok: false as const };
    await this.db
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.token, token));
    return { ok: true as const, email: invite.email };
  }
}
