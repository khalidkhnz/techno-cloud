"use client";

import Link from "next/link";
import { ArrowUpRight, FolderGit2, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { NewProjectDialog } from "@/components/app/new-project-dialog";
import { TargetBadge } from "@/components/app/target-badge";
import { Stagger, StaggerItem } from "@/components/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/lib/query/projects";
import type { Project } from "@/lib/api";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every repo connected to the platform."
        actions={<NewProjectDialog />}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <StaggerItem key={p.id}>
              <ProjectCard project={p} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          description="Connect your first repository to deploy it to AWS."
          action={<NewProjectDialog />}
        />
      )}
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const repo =
    project.source && typeof project.source === "object" && "repo" in project.source
      ? String((project.source as { repo?: string }).repo ?? "")
      : "";

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="glass glass-hover group relative h-full rounded-xl p-5">
        <div className="flex items-start justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderGit2 className="h-4 w-4" />
          </span>
          <ArrowUpRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-primary" />
        </div>
        <h3 className="mt-4 truncate text-base font-medium text-foreground">{project.name}</h3>
        {repo && (
          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3 shrink-0" /> {repo}
          </p>
        )}
        <div className="mt-4">
          <TargetBadge target={project.target} />
        </div>
      </div>
    </Link>
  );
}
