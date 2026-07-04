// Local dev only: load the monorepo-root .env into process.env BEFORE anything reads it.
// (In production the API runs on Lambda via lambda.ts, which does NOT import this — env comes
// from the Lambda's own environment.) Must be the FIRST import in main.ts.
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), "../../.env") });
