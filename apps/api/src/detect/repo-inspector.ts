/**
 * Lightweight repo inspection for the create flow: fetch the repository's top-level file names and
 * package.json so `detectFramework` can run before any clone/build. GitHub is fully supported;
 * other providers gracefully fall back to an empty inspection (detection defaults to Nixpacks).
 */

import type { PackageJsonLike, SourceInspection } from "@techno-deployer/core";

export interface InspectResult {
  inspection: SourceInspection;
  inspected: boolean;
  note?: string;
  needsToken?: boolean; // 404 — repo private or not found; a token may be required
  dockerfile?: string; // raw Dockerfile content when the repo has one (masked before display)
}

const EMPTY: SourceInspection = { files: [] };
const MAX_DOCKERFILE_BYTES = 16_384;

export async function inspectRepo(opts: {
  provider: string;
  repo: string;
  ref?: string;
  token?: string;
  subdir?: string;
}): Promise<InspectResult> {
  const { provider, repo, ref, token, subdir } = opts;
  if (!repo) return { inspection: EMPTY, inspected: false, note: "No repository provided." };

  if (provider === "github") {
    try {
      return await inspectGithub(repo, ref, token, subdir);
    } catch (err) {
      const msg = (err as Error).message;
      const notFound = msg.includes("404");
      return {
        inspection: EMPTY,
        inspected: false,
        needsToken: notFound && !token,
        note: notFound
          ? "Repository not found or private — add an access token to analyze it."
          : `Could not inspect GitHub repo (${msg}).`,
      };
    }
  }

  return {
    inspection: EMPTY,
    inspected: false,
    note: `Auto-detection currently supports GitHub; ${provider} repos default to Nixpacks.`,
  };
}

async function inspectGithub(
  repo: string,
  ref?: string,
  token?: string,
  subdir?: string,
): Promise<InspectResult> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "techno-deployer",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const dir = (subdir ?? "").replace(/^\/+|\/+$/g, ""); // trim slashes
  const prefix = dir ? `${dir}/` : "";

  const rootRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${dir}${suffix}`,
    { headers },
  );
  if (!rootRes.ok) throw new Error(`HTTP ${rootRes.status}`);
  const root = (await rootRes.json()) as Array<{ name: string; type: string }>;
  const files = Array.isArray(root) ? root.map((f) => f.name) : [];

  const readFile = async (path: string): Promise<string | undefined> => {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${prefix}${path}${suffix}`,
      { headers },
    );
    if (!res.ok) return undefined;
    const body = (await res.json()) as { content?: string; encoding?: string };
    if (body.content && body.encoding === "base64") {
      return Buffer.from(body.content, "base64").toString("utf8");
    }
    return undefined;
  };

  let packageJson: PackageJsonLike | undefined;
  if (files.includes("package.json")) {
    const raw = await readFile("package.json");
    if (raw) {
      try {
        packageJson = JSON.parse(raw) as PackageJsonLike;
      } catch {
        // malformed package.json — detection proceeds on file list alone
      }
    }
  }

  let dockerfile: string | undefined;
  if (files.includes("Dockerfile")) {
    const raw = await readFile("Dockerfile");
    if (raw) dockerfile = raw.slice(0, MAX_DOCKERFILE_BYTES);
  }

  return { inspection: { files, packageJson }, inspected: true, dockerfile };
}
