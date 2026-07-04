"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TargetBadge, TARGETS } from "@/components/app/target-badge";
import { useCreateProject } from "@/lib/query/projects";
import { useEstimates } from "@/lib/query/costs";
import { usePlatformConfig } from "@/lib/query/admin";
import { ALWAYS_ON_TARGETS, TARGET_FLAG } from "@/lib/api";

const DEFAULT_TEAM = "00000000-0000-0000-0000-000000000000";
const ALL_TARGETS = Object.keys(TARGETS);

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("lambda");
  const [repo, setRepo] = useState("");
  const [buildCmd, setBuildCmd] = useState("");
  const [startCmd, setStartCmd] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const create = useCreateProject();
  const { data: estimates } = useEstimates();
  const { data: config } = usePlatformConfig();

  const est = estimates?.[target];
  const available = config
    ? ALL_TARGETS.filter((t) => config.targets[TARGET_FLAG[t] ?? ""])
    : ALL_TARGETS;

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
        source: { provider: "github", repo },
        buildConfig,
        notifyEmail: notifyEmail || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setRepo("");
          setBuildCmd("");
          setStartCmd("");
          setNotifyEmail("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="glow">
          <Plus className="h-4 w-4" /> New project
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Connect a repo and pick a deploy target.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
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

          <div className="grid gap-1.5">
            <Label htmlFor="np-repo">Repository</Label>
            <Input
              id="np-repo"
              placeholder="owner/repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Deploy target</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <TargetBadge target={t} />
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {est && (
              <p className="text-xs text-muted-foreground">
                Est. ~${est.monthlyLowUsd}–${est.monthlyHighUsd}/mo
              </p>
            )}
            {ALWAYS_ON_TARGETS.includes(target) && (
              <p className="flex items-center gap-1.5 text-xs text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" /> Always-on — billed 24/7 (no scale-to-zero).
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="np-build" className="text-xs text-muted-foreground">
                Build cmd
              </Label>
              <Input
                id="np-build"
                placeholder="optional"
                value={buildCmd}
                onChange={(e) => setBuildCmd(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-start" className="text-xs text-muted-foreground">
                Start cmd
              </Label>
              <Input
                id="np-start"
                placeholder="optional"
                value={startCmd}
                onChange={(e) => setStartCmd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="np-notify" className="text-xs text-muted-foreground">
              Notify email
            </Label>
            <Input
              id="np-notify"
              type="email"
              placeholder="optional — deploy notifications"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={create.isPending} className="glow">
              {create.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
