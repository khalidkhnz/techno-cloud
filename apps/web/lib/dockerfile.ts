/**
 * Client-side Dockerfile preview helpers for the create flow.
 * - maskSecrets: redact secret-looking values before display (defense-in-depth; the Dockerfile
 *   itself rarely holds secrets, but ENV/ARG lines and pasted tokens might).
 * - generateDockerfile: synthesize a representative Dockerfile from the detected framework + the
 *   user's build/start commands, updated live as they type.
 */

const SECRET_KEY = /(SECRET|TOKEN|PASSWORD|PASSWD|PWD|CREDENTIAL|PRIVATE[_-]?KEY|API[_-]?KEY|ACCESS[_-]?KEY|AUTH)/i;

/** Redact secret-looking ENV/ARG values and long token-like strings. */
export function maskSecrets(input: string, extra: string[] = []): string {
  let out = input
    // ENV KEY value / ENV KEY=value / ARG KEY=value where KEY looks sensitive
    .replace(
      /^(\s*(?:ENV|ARG)\s+)([A-Z0-9_]+)(\s*=\s*|\s+)(.+)$/gim,
      (m, kw: string, key: string, sep: string, val: string) =>
        SECRET_KEY.test(key) ? `${kw}${key}${sep}${mask(val)}` : m,
    )
    // Common token shapes anywhere (GitHub, GitLab, generic bearer)
    .replace(/\b(ghp_|gho_|ghs_|glpat-)[A-Za-z0-9_-]{8,}\b/g, (m) => m.slice(0, 4) + "•••")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, (m) => (SECRET_KEY.test(m) ? "•••" : m));

  // Redact any explicitly-supplied sensitive strings (e.g. the access token the user typed).
  for (const s of extra) {
    if (s && s.length >= 4) out = out.split(s).join("•••");
  }
  return out;
}

function mask(val: string): string {
  const trimmed = val.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return val;
  return "•••";
}

export interface GenerateOpts {
  framework: string;
  buildStrategy: "dockerfile" | "nixpacks" | "static";
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
}

const NODE_FRAMEWORKS = new Set([
  "next",
  "vite",
  "create-react-app",
  "node-api",
  "static",
  "unknown",
]);

/** A representative Dockerfile for the Nixpacks/static path (repo has no Dockerfile). */
export function generateDockerfile(opts: GenerateOpts): string {
  const isNode = NODE_FRAMEWORKS.has(opts.framework);
  const base = isNode ? "node:20-slim" : "debian:stable-slim";
  const install = opts.installCommand?.trim() || (isNode ? "npm ci" : "# install dependencies");
  const build = opts.buildCommand?.trim() || (isNode ? "npm run build" : "# build");
  const start = opts.startCommand?.trim() || (isNode ? "node ." : "# start command");

  if (opts.buildStrategy === "static") {
    return [
      `# Auto-generated preview · static export → S3 + CloudFront`,
      `# Framework: ${opts.framework}`,
      ``,
      `FROM ${base} AS build`,
      `WORKDIR /app`,
      `COPY . .`,
      `RUN ${install}`,
      `RUN ${build}`,
      ``,
      `# Output (e.g. dist/ or build/) is uploaded to S3 and served via CloudFront.`,
    ].join("\n");
  }

  return [
    `# Auto-generated preview · built with Nixpacks (no Dockerfile in repo)`,
    `# Framework: ${opts.framework}`,
    ``,
    `FROM ${base}`,
    `WORKDIR /app`,
    ``,
    `COPY . .`,
    `RUN ${install}`,
    `RUN ${build}`,
    ``,
    `EXPOSE 8080`,
    `CMD ${JSON.stringify(["sh", "-c", start])}`,
  ].join("\n");
}
