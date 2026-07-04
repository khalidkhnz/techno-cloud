"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "./keys";
import { errMsg } from "./util";

export function useAudit(action?: string) {
  return useQuery({
    queryKey: qk.audit(action),
    queryFn: () => api.getAudit(action),
  });
}

export function usePlatformConfig() {
  return useQuery({ queryKey: qk.platformConfig, queryFn: api.getPlatformConfig });
}

export function useInvites() {
  return useQuery({ queryKey: qk.invites, queryFn: api.listInvites });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; teamId: string; role?: string }) => api.createInvite(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.invites });
      toast.success("Invite sent");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
