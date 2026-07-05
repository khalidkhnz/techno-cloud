"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  FolderTree,
  KeyRound,
  Leaf,
  Loader2,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { TargetBadge } from "@/components/app/target-badge";
import { BuildPlanView } from "@/components/app/build-plan";
import { DockerfilePreview } from "@/components/app/dockerfile-preview";
import { NginxPreview } from "@/components/app/nginx-preview";
import { TargetConfigForm, type ConfigValue } from "@/components/app/target-config-form";
import { FadeIn } from "@/components/motion";
import { generateDockerfile, maskSecrets } from "@/lib/dockerfile";
import { generateNginxConfig } from "@/lib/nginx";
import { estimateTargetCost } from "@/lib/pricing";
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
import { useDetectRepo, useInstanceNginx } from "@/lib/query/detect";

const DEFAULT_TEAM = "00000000-0000-0000-0000-000000000000";

// Detected framework → manual project-type id (so the dropdown reflects detection).
const FRAMEWORK_TO_TYPE: Record<string, string> = {
  next: "next",
  vite: "spa",
  "create-react-app": "spa",
  static: "static",
  "node-api": "node-api",
  docker: "docker",
  unknown: "other",
};

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("github");
  const [target, setTarget] = useState("lambda");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [subdir, setSubdir] = useState("");
  const [buildCmd, setBuildCmd] = useState("");
  const [startCmd, setStartCmd] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [targetConfig, setTargetConfig] = useState<Record<string, ConfigValue>>({});
  const [manualType, setManualType] = useState<string | null>(null);

  const create = useCreateProject();
  const detect = useDetectRepo();
  const detection = detect.data;
  const { data: meta } = useMeta();
  const { data: estimates } = useEstimates();

  const providers = meta?.providers ?? [];
  const selectedProvider = providers.find((p) => p.kind === provider);
  const isZip = provider === "zip";

  // Effective project type: manual choice wins, else the detected framework's type.
  const detectedTypeId = detection?.inspected
    ? (FRAMEWORK_TO_TYPE[detection.detection.framework] ?? "other")
    : null;
  const projectTypeId = manualType ?? detectedTypeId;
  const effectiveType = projectTypeId
    ? meta?.projectTypes.find((t) => t.id === projectTypeId)
    : undefined;
  const allowedKinds = effectiveType?.supportedTargets ?? null;

  const allTargets = (meta?.targets ?? []).filter((t) => t.enabled);
  const targets = allowedKinds ? allTargets.filter((t) => allowedKinds.includes(t.kind)) : allTargets;
  const selectedTarget = targets.find((t) => t.kind === target) ?? allTargets.find((t) => t.kind === target);
  const targetSchema = selectedTarget?.configSchema ?? [];
  // Config-aware live estimate; fall back to the target's default range before config is set.
  const cost = estimateTargetCost(target, targetConfig);
  const fallback = estimates?.[target];

  // Live Dockerfile preview: repo's own if present, else generated from strategy + commands.
  const buildStrategy = effectiveType?.buildStrategy ?? detection?.detection.buildStrategy ?? "nixpacks";
  const repoDockerfile = detection?.dockerfile ?? null;
  const rawPreview =
    repoDockerfile ??
    generateDockerfile({
      framework: detection?.detection.framework ?? projectTypeId ?? "unknown",
      buildStrategy,
      buildCommand: buildCmd,
      startCommand: startCmd,
    });
  const previewContent = maskSecrets(rawPreview, [token].filter(Boolean));

  // EC2 Nginx preview: config that will be written (new) or appended (existing), with a live diff.
  const nginx = useInstanceNginx();
  const isEc2 = target === "ec2";
  const ec2Mode = String(targetConfig.mode ?? "new");
  const ec2Port = Number(targetConfig.port) || 8080;
  const ec2InstanceId = String(targetConfig.instanceId ?? "");
  const appendedNginx = generateNginxConfig({
    port: ec2Port,
    ...(ec2Mode === "existing" ? { serverName: `${name || "app"}.your-domain.com` } : {}),
  });
  const previewSubtitle = repoDockerfile
    ? "From your repository — the build uses this as-is."
    : buildStrategy === "static"
      ? "Generated preview — static export (build output → S3 + CloudFront)."
      : "Generated preview — no Dockerfile in repo; built with Nixpacks. Edit build/start to update.";

  // Reset target config to the target's schema defaults whenever the target changes.
  useEffect(() => {
    const schema = meta?.targets.find((t) => t.kind === target)?.configSchema ?? [];
    const defaults: Record<string, ConfigValue> = {};
    for (const f of schema) if (f.default !== undefined) defaults[f.key] = f.default;
    setTargetConfig(defaults);
  }, [target, meta]);

  // Auto-analyze on provider / repo / token / subdir change (debounced).
  useEffect(() => {
    if (isZip || repo.trim().length < 3) return;
    const t = setTimeout(() => {
      detect.mutate(
        { provider, repo: repo.trim(), ...(token ? { token } : {}), ...(subdir ? { subdir } : {}) },
        {
          onSuccess: (r) => {
            setManualType(null);
            if (r.inspected && r.detection.recommendedTarget) setTarget(r.detection.recommendedTarget);
          },
        },
      );
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, repo, token, subdir]);

  function pickType(id: string) {
    setManualType(id);
    const t = meta?.projectTypes.find((p) => p.id === id);
    if (t) setTarget(t.recommendedTarget);
  }

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
        source: {
          provider,
          ...(repo ? { repo: repo.trim() } : {}),
          ...(token ? { token } : {}),
          ...(subdir ? { subdir: subdir.trim() } : {}),
          ...(projectTypeId ? { projectType: projectTypeId } : {}),
        },
        buildConfig,
        targetConfig: Object.keys(targetConfig).length ? targetConfig : undefined,
        notifyEmail: notifyEmail || undefined,
      },
      { onSuccess: () => router.push("/projects") },
    );
  }

  const detectionFailed = detect.isSuccess && detection ? !detection.inspected : false;

  return (
    <FadeIn className="mx-auto max-w-5xl">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Projects
      </Link>

      <PageHeader title="New project" description="Connect a repository and deploy it to AWS." />

      <div className="grid gap-6 lg:grid-cols-[1fr_23rem]">
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
              Choose a git provider and repository. The project is analyzed automatically.
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

              {!isZip && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="np-subdir" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FolderTree className="h-3.5 w-3.5" /> Root directory (monorepo)
                    </Label>
                    <Input
                      id="np-subdir"
                      placeholder="e.g. apps/api (repo root if blank)"
                      value={subdir}
                      onChange={(e) => setSubdir(e.target.value)}
                    />
                  </div>
                  {selectedProvider?.supportsToken && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="np-token" className="text-xs text-muted-foreground">
                        Access token (private repos)
                      </Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                          id="np-token"
                          type="password"
                          className="pl-9 font-mono"
                          placeholder="ghp_… / glpat-…"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isZip && (
                <p className="text-xs text-muted-foreground">
                  Zip upload — upload your build artifact after creating the project.
                </p>
              )}

              {detection?.needsToken && (
                <p className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Repository is private or not found — add an access token above to analyze it.
                </p>
              )}
            </div>
          </section>

          {/* Project type / detection */}
          <section className="glass rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-foreground">Project type</h2>
                <p className="text-xs text-muted-foreground">
                  Auto-detected from the repo. Override it if needed.
                </p>
              </div>
              {detect.isPending && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…
                </span>
              )}
              {detection?.inspected && !detect.isPending && (
                <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> {detection.detection.framework} detected
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3">
              <Select value={projectTypeId ?? ""} onValueChange={pickType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type…" />
                </SelectTrigger>
                <SelectContent>
                  {(meta?.projectTypes ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {detectionFailed && !detection?.needsToken && (
                <p className="flex items-center gap-1.5 text-xs text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {detection?.note ?? "Couldn't auto-detect — pick a project type above."}
                </p>
              )}

              {!repo && !isZip && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled
                  className="w-fit"
                >
                  <ScanSearch className="h-3.5 w-3.5" /> Enter a repo to analyze
                </Button>
              )}

              {detection?.inspected && (
                <>
                  <p className="text-xs text-muted-foreground">{detection.detection.reason}</p>
                  <BuildPlanView plan={detection.plan} />
                </>
              )}
            </div>
          </section>

          {/* Deploy target */}
          <section className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-foreground">Deploy target</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {allowedKinds
                ? "Filtered to targets supported by the selected project type."
                : "Serverless options stay near-free; always-on targets bill 24/7."}
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
                    <span className="font-mono text-foreground">
                      Est.{" "}
                      {cost.low === cost.high ? `~$${cost.high}` : `~$${cost.low}–$${cost.high}`}/mo
                    </span>
                  </div>
                  {cost.note && <p className="mt-1.5 text-[11px] text-muted-foreground">{cost.note}</p>}
                  {cost.high === 0 && fallback && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Baseline ~${fallback.monthlyLowUsd}–${fallback.monthlyHighUsd}/mo
                    </p>
                  )}
                </div>
              )}

              {targetSchema.length > 0 && (
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">
                    {selectedTarget?.label} configuration
                  </p>
                  <TargetConfigForm
                    schema={targetSchema}
                    values={targetConfig}
                    onChange={(k, v) => setTargetConfig((c) => ({ ...c, [k]: v }))}
                  />
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

        <aside className="grid gap-4 lg:sticky lg:top-8 lg:h-fit">
          <DockerfilePreview
            title={repoDockerfile ? "Dockerfile" : "Dockerfile · preview"}
            subtitle={previewSubtitle}
            content={previewContent}
          />

          {isEc2 && (
            <div className="grid gap-2">
              {ec2Mode === "existing" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                  disabled={!ec2InstanceId || nginx.isPending}
                  onClick={() => nginx.mutate({ instanceId: ec2InstanceId, port: ec2Port })}
                >
                  {nginx.isPending ? "Reading instance…" : "Load current config from instance"}
                </Button>
              )}
              <NginxPreview
                mode={ec2Mode === "existing" ? "existing" : "new"}
                appended={appendedNginx}
                current={ec2Mode === "existing" ? nginx.data?.current : undefined}
                note={ec2Mode === "existing" ? nginx.data?.note : undefined}
                instanceId={ec2InstanceId}
              />
            </div>
          )}
        </aside>
      </div>
    </FadeIn>
  );
}
