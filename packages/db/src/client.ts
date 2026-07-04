/**
 * Neon serverless client over the POOLED endpoint (use the `-pooler` host in DATABASE_URL).
 * Pooling is required from Lambda to avoid connection exhaustion — see PRICING_REFERENCE.md (Neon).
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@techno-deployer/env";
import * as schema from "./schema.js";

// DATABASE_URL is validated by T3 Env (must be the Neon pooled endpoint).
const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export type Db = typeof db;
