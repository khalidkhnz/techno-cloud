import "reflect-metadata";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import { env } from "@techno-deployer/env";
import { AppModule } from "./app.module.js";
import { auth } from "./auth/auth.js";

/** Local dev entrypoint. In production the API runs on Lambda via `lambda.ts`. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors({ origin: env.APP_ORIGIN ?? true, credentials: true });

  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  // Better Auth needs the raw body — mount it BEFORE the JSON parser.
  expressApp.all("/api/auth/*", toNodeHandler(auth));
  // Capture the raw body so webhook HMAC signatures can be verified over exact bytes.
  expressApp.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  await app.listen(env.PORT);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.PORT}`);
}

void bootstrap();
