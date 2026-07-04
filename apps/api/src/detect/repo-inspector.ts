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
}

const EMPTY: SourceInspection = { files: [] };

export async function inspectRepo(opts: {
  provider: string;
  repo: string;
  ref?: string;
  token?: string;
}): Promise<InspectResult> {
  const { provider, repo, ref, token } = opts;
  if (!repo) return { inspection: EMPTY, inspected: false, note: "No repository provided." };

  if (provider === "github") {
    try {
      return await inspectGithub(repo, ref, token);
    } catch (err) {
      return {
        inspection: EMPTY,
        inspected: false,
        note: `Could not inspect GitHub repo (${(err as Error).message}). Add a token for private repos.`,
      };
    }
  }

  return {
    inspection: EMPTY,
    inspected: false,
    note: `Auto-detection currently supports GitHub; ${provider} repos default to Nixpacks.`,
  };
}

async function inspectGithub(repo: string, ref?: string, token?: string): Promise<InspectResult> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "techno-deployer",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : "";

  const rootRes = await fetch(`https://api.github.com/repos/${repo}/contents${suffix}`, { headers });
  if (!rootRes.ok) throw new Error(`HTTP ${rootRes.status}`);
  const root = (await rootRes.json()) as Array<{ name: string; type: string }>;
  const files = Array.isArray(root) ? root.map((f) => f.name) : [];

  let packageJson: PackageJsonLike | undefined;
  if (files.includes("package.json")) {
    const pkgRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/package.json${suffix}`,
      { headers },
    );
    if (pkgRes.ok) {
      const body = (await pkgRes.json()) as { content?: string; encoding?: string };
      if (body.content && body.encoding === "base64") {
        try {
          packageJson = JSON.parse(
            Buffer.from(body.content, "base64").toString("utf8"),
          ) as PackageJsonLike;
        } catch {
          // malformed package.json — detection proceeds on file list alone
        }
      }
    }
  }

  return { inspection: { files, packageJson }, inspected: true };
}
