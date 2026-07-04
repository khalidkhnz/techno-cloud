import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { env } from "@techno-deployer/env";
import { AppModule } from "./app.module.js";

/** Local dev entrypoint. In production the API runs on Lambda via `lambda.ts`. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(env.PORT);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.PORT}`);
}

void bootstrap();
