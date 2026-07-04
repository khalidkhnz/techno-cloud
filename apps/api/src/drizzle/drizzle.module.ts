import { Global, Module } from "@nestjs/common";
import { db } from "@techno-deployer/db";

/** DI token for the Drizzle client. Inject with `@Inject(DRIZZLE) db: Db`. */
export const DRIZZLE = Symbol("DRIZZLE");

@Global()
@Module({
  providers: [{ provide: DRIZZLE, useValue: db }],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
