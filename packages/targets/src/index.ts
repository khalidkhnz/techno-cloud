import { DeployTargetRegistry } from "@techno-deployer/core";
import { LambdaTarget } from "./lambda.js";
import { AmplifyTarget } from "./amplify.js";

export { LambdaTarget } from "./lambda.js";
export { AmplifyTarget } from "./amplify.js";

/** Registry with the Phase 1 targets. Phase 2 adds static-cdn, apprunner, ecs-fargate; Phase 4 ec2. */
export function createTargetRegistry(): DeployTargetRegistry {
  const registry = new DeployTargetRegistry();
  registry.register(new LambdaTarget());
  registry.register(new AmplifyTarget());
  return registry;
}
