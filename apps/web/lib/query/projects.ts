"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "./keys";
import { errMsg } from "./util";

export function useProjects() {
  return useQuery({ queryKey: qk.projects.all, queryFn: api.listProjects });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: qk.projects.detail(id),
    queryFn: () => api.getProject(id),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects.all });
      toast.success("Project created");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
