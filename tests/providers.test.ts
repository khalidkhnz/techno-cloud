import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BitbucketProvider,
  GithubProvider,
  GitlabProvider,
  ZipProvider,
} from "@techno-deployer/providers";

describe("GithubProvider", () => {
  const gh = new GithubProvider();

  it("parses a push webhook", () => {
    const event = gh.parseWebhook(
      { "x-github-event": "push" },
      { ref: "refs/heads/main", after: "abc123", repository: { full_name: "acme/app" } },
    );
    expect(event).toEqual({ provider: "github", repo: "acme/app", ref: "main", commit: "abc123" });
  });

  it("ignores non-push events", () => {
    expect(gh.parseWebhook({ "x-github-event": "issues" }, {})).toBeNull();
  });

  it("builds an authenticated clone URL", () => {
    expect(gh.cloneUrl("acme/app", "tok")).toBe("https://x-access-token:tok@github.com/acme/app.git");
  });

  it("verifies a valid HMAC signature and rejects a wrong secret", () => {
    const body = Buffer.from(JSON.stringify({ a: 1 }));
    const secret = "shhh";
    const sig = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(gh.verifySignature({ "x-hub-signature-256": sig }, body, secret)).toBe(true);
    expect(gh.verifySignature({ "x-hub-signature-256": sig }, body, "wrong")).toBe(false);
  });
});

describe("GitlabProvider", () => {
  const gl = new GitlabProvider();

  it("parses a push and compares the token", () => {
    const event = gl.parseWebhook(
      {},
      { object_kind: "push", ref: "refs/heads/dev", checkout_sha: "sha", project: { path_with_namespace: "grp/proj" } },
    );
    expect(event).toEqual({ provider: "gitlab", repo: "grp/proj", ref: "dev", commit: "sha" });
    expect(gl.verifySignature({ "x-gitlab-token": "s" }, new Uint8Array(), "s")).toBe(true);
    expect(gl.verifySignature({ "x-gitlab-token": "s" }, new Uint8Array(), "x")).toBe(false);
  });

  it("builds clone URLs with and without a token", () => {
    expect(gl.cloneUrl("grp/proj", "tok")).toBe("https://oauth2:tok@gitlab.com/grp/proj.git");
    expect(gl.cloneUrl("grp/proj")).toBe("https://gitlab.com/grp/proj.git");
  });
});

describe("BitbucketProvider", () => {
  const bb = new BitbucketProvider();
  it("parses a branch push", () => {
    const event = bb.parseWebhook(
      { "x-event-key": "repo:push" },
      { push: { changes: [{ new: { name: "main", type: "branch", target: { hash: "h" } } }] }, repository: { full_name: "t/r" } },
    );
    expect(event).toEqual({ provider: "bitbucket", repo: "t/r", ref: "main", commit: "h" });
  });

  it("builds an authenticated clone URL", () => {
    expect(bb.cloneUrl("t/r", "tok")).toBe("https://x-token-auth:tok@bitbucket.org/t/r.git");
  });
});

describe("ZipProvider", () => {
  it("has no webhook or signature", () => {
    const z = new ZipProvider();
    expect(z.parseWebhook({}, {})).toBeNull();
    expect(z.verifySignature({}, new Uint8Array(), "s")).toBe(false);
  });
});
