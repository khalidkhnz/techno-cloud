/**
 * Neon serverless client over the POOLED endpoint (use the `-pooler` host in DATABASE_URL).
 * Pooling is required from Lambda to avoid connection exhaustion — see PRICING_REFERENCE.md (Neon).
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (use the Neon pooled endpoint).");
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export type Db = typeof db;
