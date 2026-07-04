import "reflect-metadata";
import { configure as serverlessExpress } from "@codegenie/serverless-express";
import { ExpressAdapter } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import express from "express";
import type { Handler } from "aws-lambda";
import { AppModule } from "./app.module.js";

/**
 * AWS Lambda handler (arm64) behind a Function URL. Cold-start optimized: build the Nest app
 * once per container and cache the serverless-express handler. See PLAN.md §2.
 */
let cached: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.enableCors();
  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  cached ??= await bootstrap();
  return cached(event, context, callback);
};
