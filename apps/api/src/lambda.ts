import "reflect-metadata";
import { configure as serverlessExpress } from "@codegenie/serverless-express";
import { ExpressAdapter } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import type { Handler } from "aws-lambda";
import { env } from "@techno-deployer/env";
import { AppModule } from "./app.module.js";
import { auth } from "./auth/auth.js";

/**
 * AWS Lambda handler (arm64) behind a Function URL. Cold-start optimized: build the Nest app
 * once per container and cache the serverless-express handler. See PLAN.md §2.
 */
let cached: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();
  // Better Auth needs the raw body — mount it before Nest's JSON parser.
  expressApp.all("/api/auth/*", toNodeHandler(auth));
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bodyParser: false,
  });
  app.enableCors({ origin: env.APP_ORIGIN ?? true, credentials: true });
  expressApp.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  cached ??= await bootstrap();
  return cached(event, context, callback);
};
