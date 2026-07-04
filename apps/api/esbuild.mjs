// Bundles each Lambda handler + the deploy entrypoint into self-contained ESM files under
// dist-lambda/, so the platform Lambdas (infra/platform.ts) have their deps included.
// Nest's optional transport/validation peers are marked external (not used by this app).
import { build } from "esbuild";
import { esbuildDecorators } from "@anatine/esbuild-decorators";

const OPTIONAL_NEST = [
  "@nestjs/microservices",
  "@nestjs/websockets",
  "@nestjs/platform-socket.io",
  "@fastify/static",
  "class-transformer",
  "class-validator",
  "@nestjs/microservices/microservices-module",
  "@nestjs/websockets/socket-module",
];

await build({
  entryPoints: [
    "src/lambda.ts",
    "src/workers/build.worker.ts",
    "src/workers/deploy.worker.ts",
    "src/scheduled/usage-poller.handler.ts",
    "src/scheduled/alerts.handler.ts",
    "src/scheduled/reaper.handler.ts",
    "src/deploy-entrypoint.ts",
  ],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir: "dist-lambda",
  outExtension: { ".js": ".mjs" },
  // ESM interop shim so bundled CJS deps that reference require/__dirname work.
  banner: {
    js: "import{createRequire as _cr}from'module';const require=_cr(import.meta.url);import{fileURLToPath as _f}from'url';import{dirname as _d}from'path';const __filename=_f(import.meta.url);const __dirname=_d(__filename);",
  },
  external: [...OPTIONAL_NEST, "@aws-sdk/*", "aws-sdk"],
  // Preserve `emitDecoratorMetadata` (design:paramtypes) so NestJS DI works in the bundle.
  plugins: [esbuildDecorators({ tsconfig: "tsconfig.json" })],
  logLevel: "info",
});
