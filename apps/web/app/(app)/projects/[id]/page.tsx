"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Rocket } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { TargetBadge } from "@/components/app/target-badge";
import { DeploymentsTab } from "@/components/app/project/deployments-tab";
import { EnvVarsTab } from "@/components/app/project/env-vars-tab";
import { EnvironmentsTab } from "@/components/app/project/environments-tab";
import { DomainsTab } from "@/components/app/project/domains-tab";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/lib/query/projects";
import { useDeploy } from "@/lib/query/deployments";

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project } = useProject(id);
  const deploy = useDeploy(id);

  return (
    <FadeIn>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Projects
      </Link>

      <PageHeader
        title={project?.name ?? id}
        description={project ? <TargetBadge target={project.target} /> : undefined}
        actions={
          <Button className="glow" onClick={() => deploy.mutate()} disabled={deploy.isPending}>
            <Rocket className="h-4 w-4" /> {deploy.isPending ? "Queuing…" : "Deploy"}
          </Button>
        }
      />

      <Tabs defaultValue="deployments" className="mt-2">
        <TabsList className="glass mb-5 border-white/[0.06]">
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="env">Variables</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
        </TabsList>

        <TabsContent value="deployments">
          <DeploymentsTab projectId={id} />
        </TabsContent>
        <TabsContent value="env">
          <EnvVarsTab projectId={id} />
        </TabsContent>
        <TabsContent value="environments">
          <EnvironmentsTab projectId={id} />
        </TabsContent>
        <TabsContent value="domains">
          <DomainsTab projectId={id} />
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}
