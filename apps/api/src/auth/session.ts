import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { auth } from "./auth.js";

/** Resolve the Better Auth session for an incoming Express request (null if unauthenticated). */
export function getSession(req: Request) {
  return auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
}
