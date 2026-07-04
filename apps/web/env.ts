/**
 * Validated env for the Next.js dashboard (T3 Env). Client vars must be prefixed NEXT_PUBLIC_
 * and listed in `runtimeEnv` explicitly (Next.js inlines them at build). Server vars are only
 * accessible in server components / route handlers.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
