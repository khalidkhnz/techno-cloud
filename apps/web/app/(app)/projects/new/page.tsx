"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, KeyRound, Leaf } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { TargetBadge } from "@/components/app/target-badge";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateProject } from "@/lib/query/projects";
import { useEstimates } from "@/lib/query/costs";
import { useMeta } from "@/lib/query/meta";

const DEFAULT_TEAM = "00000000-0000-0000-0000-000000000000";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("github");
  const [target, setTarget] = useState("lambda");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [buildCmd, setBuildCmd] = useState("");
  const [startCmd, setStartCmd] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const create = useCreateProject();
  const { data: meta } = useMeta();
  const { data: estimates } = useEstimates();

  const providers = meta?.providers ?? [];
  const targets = (meta?.targets ?? []).filter((t) => t.enabled);
  const selectedProvider = providers.find((p) => p.kind === provider);
  const selectedTarget = targets.find((t) => t.kind === target);
  const est = estimates?.[target];
  const isZip = provider === "zip";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const buildConfig =
      buildCmd || startCmd
        ? {
            ...(buildCmd ? { buildCommand: buildCmd } : {}),
            ...(startCmd ? { startCommand: startCmd } : {}),
          }
        : undefined;
    create.mutate(
      {
        teamId: DEFAULT_TEAM,
        name,
        target,
        source: { provider, ...(repo ? { repo } : {}), ...(token ? { token } : {}) },
        buildConfig,
        notifyEmail: notifyEmail || undefined,
      },
      { onSuccess: () => router.push("/projects") },
    );
  }

  return (
    <FadeIn className="mx-auto max-w-2xl">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Projects
      </Link>

      <PageHeader title="New project" description="Connect a repository and deploy it to AWS." />

      <form onSubmit={submit} className="grid gap-6">
        {/* Project */}
        <section className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-foreground">Project</h2>
          <p className="mb-4 text-xs text-muted-foreground">A name to identify this service.</p>
          <div className="grid gap-1.5">
            <Label htmlFor="np-name">Name</Label>
            <Input
              id="np-name"
              placeholder="my-service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </section>

        {/* Source */}
        <section className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-foreground">Connect source</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Choose a git provider and repository. Add a token for private repos.
          </p>
          <div className="grid gap-4">
            <div className="grid gap-1.5 sm:grid-cols-[12rem_1fr] sm:gap-3">
              <div className="grid gap-1.5">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.kind} value={p.kind}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isZip && (
                <div className="grid gap-1.5">
                  <Label htmlFor="np-repo">Repository</Label>
                  <Input
                    id="np-repo"
                    placeholder={selectedProvider?.repoPlaceholder || "owner/repo"}
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {isZip ? (
              <p className="text-xs text-muted-foreground">
                Zip upload — upload your build artifact after creating the project.
              </p>
            ) : (
              selectedProvider?.supportsToken && (
                <div className="grid gap-1.5">
                  <Label htmlFor="np-token" className="text-xs text-muted-foreground">
                    Access token (optional — for private repos)
                  </Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="np-token"
                      type="password"
                      className="pl-9 font-mono"
                      placeholder="ghp_… / glpat-… (leave blank for public)"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* Deploy target */}
        <section className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-foreground">Deploy target</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Every target is available — serverless options stay near-free; always-on targets bill 24/7.
          </p>
          <div className="grid gap-3">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t.kind} value={t.kind}>
                    <span className="flex items-center gap-2">
                      <TargetBadge target={t.kind} />
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTarget && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
                <p className="text-muted-foreground">{selectedTarget.description}</p>
                <Separator className="my-2 bg-white/[0.06]" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {selectedTarget.alwaysOn ? (
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Always-on — billed 24/7 (no scale-to-zero).
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-primary">
                      <Leaf className="h-3.5 w-3.5" />
                      Scales to zero — near-free when idle.
                    </span>
                  )}
                  {est && (
                    <span className="font-mono text-muted-foreground">
                      Est. ~${est.monthlyLowUsd}–${est.monthlyHighUsd}/mo
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Build + notifications */}
        <section className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-foreground">Build &amp; notifications</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Optional. Build/start commands feed Nixpacks; notify email receives deploy status.
          </p>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="np-build">Build command</Label>
                <Input
                  id="np-build"
                  placeholder="e.g. npm run build"
                  value={buildCmd}
                  onChange={(e) => setBuildCmd(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="np-start">Start command</Label>
                <Input
                  id="np-start"
                  placeholder="e.g. node dist/main.js"
                  value={startCmd}
                  onChange={(e) => setStartCmd(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-notify">Notify email</Label>
              <Input
                id="np-notify"
                type="email"
                placeholder="deploy-status@company.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="ghost">
            <Link href="/projects">Cancel</Link>
          </Button>
          <Button type="submit" disabled={create.isPending} className="glow">
            {create.isPending ? "Creating…" : "Create project"}
          </Button>
        </div>
      </form>
    </FadeIn>
  );
}
