import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { tap } from "rxjs";
import { AuditService } from "./audit.service.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Auto-audits every successful mutating request with the acting user (from the session guard). */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<
      Request & { authUser?: { email: string }; route?: { path?: string } }
    >();

    if (!MUTATING.has(req.method) || req.path.startsWith("/api/auth")) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.audit.write({
          action: `${req.method} ${req.route?.path ?? req.path}`,
          target: req.originalUrl,
          actorEmail: req.authUser?.email,
          meta: { params: req.params },
        });
      }),
    );
  }
}
