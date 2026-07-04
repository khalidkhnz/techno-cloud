import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: resolve(process.cwd(), "../../.env") }); // db:migrate/generate read root .env

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Only needed for `db:migrate` / `db:push`, not for `db:generate`.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/techno_deployer",
  },
});
