"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "./keys";
import { errMsg } from "./util";

export function useEnvVars(projectId: string) {
  return useQuery({
    queryKey: qk.envVars(projectId),
    queryFn: () => api.listEnvVars(projectId),
    enabled: Boolean(projectId),
  });
}

export function useUpsertEnvVar(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { key: string; value: string; isSecret: boolean }) =>
      api.upsertEnvVar(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.envVars(projectId) });
      toast.success("Variable saved");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useDeleteEnvVar(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => api.deleteEnvVar(projectId, key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.envVars(projectId) });
      toast.success("Variable removed");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
