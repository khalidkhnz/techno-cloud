"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "./keys";
import { errMsg } from "./util";

export function useDomains(projectId: string) {
  return useQuery({
    queryKey: qk.domains(projectId),
    queryFn: () => api.listDomains(projectId),
    enabled: Boolean(projectId),
  });
}

export function useAddDomain(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hostname: string) => api.addDomain(projectId, hostname),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.domains(projectId) });
      toast.success("Domain added — add the DNS record, then verify");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useVerifyDomain(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) => api.verifyDomain(projectId, domainId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: qk.domains(projectId) });
      toast[res.verified ? "success" : "error"](
        res.verified ? "Domain verified" : "DNS record not found yet",
      );
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useDeleteDomain(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) => api.deleteDomain(projectId, domainId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.domains(projectId) });
      toast.success("Domain removed");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
