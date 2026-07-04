"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Deployment } from "@/lib/api";
import { qk } from "./keys";
import { errMsg } from "./util";

const ACTIVE = ["queued", "building", "deploying"];

export function useDeployments(projectId: string) {
  return useQuery({
    queryKey: qk.deployments(projectId),
    queryFn: () => api.listDeployments(projectId),
    enabled: Boolean(projectId),
    // Auto-poll while any deployment is in flight.
    refetchInterval: (query) => {
      const data = query.state.data as Deployment[] | undefined;
      return data?.some((d) => ACTIVE.includes(d.state)) ? 4000 : false;
    },
  });
}

/** Build logs for one deployment; polls every 3s while `live`. */
export function useLogs(projectId: string, deploymentId: string | null, live?: boolean) {
  return useQuery({
    queryKey: qk.logs(projectId, deploymentId ?? "", "build"),
    queryFn: () => api.getLogs(projectId, deploymentId as string, "build"),
    enabled: Boolean(deploymentId),
    refetchInterval: live ? 3000 : false,
  });
}

export function useDeploy(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.createDeployment(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deployments(projectId) });
      toast.success("Deployment queued");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useRollback(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deploymentId: string) => api.rollbackDeployment(projectId, deploymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deployments(projectId) });
      toast.success("Rollback queued");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
