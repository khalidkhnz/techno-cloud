"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "./keys";
import { errMsg } from "./util";

export function useEnvironments(projectId: string) {
  return useQuery({
    queryKey: qk.environments(projectId),
    queryFn: () => api.listEnvironments(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateEnvironment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: string; name: string }) => api.createEnvironment(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.environments(projectId) });
      toast.success("Environment created");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useDeleteEnvironment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (environmentId: string) => api.deleteEnvironment(projectId, environmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.environments(projectId) });
      toast.success("Environment deleted");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
