// Load the monorepo-root .env for db scripts (seed/migrate) run from packages/db.
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), "../../.env") });
