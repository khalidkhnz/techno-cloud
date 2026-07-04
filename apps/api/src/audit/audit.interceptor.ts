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

    // Only audit authenticated mutations. Public routes (webhooks, invite-accept, /api/auth)
    // have no authUser and can carry secrets in the URL — never log those.
    if (!MUTATING.has(req.method) || !req.authUser) {
      return next.handle();
    }

    // Log the route TEMPLATE (e.g. "/projects/:projectId/deployments"), never the raw URL —
    // the URL can contain tokens/secrets in the query string.
    const routeTemplate = req.route?.path ?? "unknown";

    return next.handle().pipe(
      tap(() => {
        void this.audit.write({
          action: `${req.method} ${routeTemplate}`,
          target: routeTemplate,
          actorEmail: req.authUser?.email,
          // Route params (ids) only — no query string, no body.
          meta: { params: req.params },
        });
      }),
    );
  }
}
