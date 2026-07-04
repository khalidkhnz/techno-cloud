import { DeployTargetRegistry } from "@techno-deployer/core";
import { LambdaTarget } from "./lambda.js";
import { AmplifyTarget } from "./amplify.js";
import { StaticCdnTarget } from "./static-cdn.js";
import { AppRunnerTarget } from "./apprunner.js";
import { EcsFargateTarget } from "./ecs-fargate.js";
import { Ec2Target } from "./ec2.js";

export { LambdaTarget } from "./lambda.js";
export { AmplifyTarget } from "./amplify.js";
export { StaticCdnTarget } from "./static-cdn.js";
export { AppRunnerTarget } from "./apprunner.js";
export { EcsFargateTarget } from "./ecs-fargate.js";
export { Ec2Target } from "./ec2.js";

/** Registry with all six deploy targets. */
export function createTargetRegistry(): DeployTargetRegistry {
  const registry = new DeployTargetRegistry();
  registry.register(new LambdaTarget());
  registry.register(new AmplifyTarget());
  registry.register(new StaticCdnTarget());
  registry.register(new AppRunnerTarget());
  registry.register(new EcsFargateTarget());
  registry.register(new Ec2Target());
  return registry;
}
