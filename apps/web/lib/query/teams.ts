"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "./keys";
import { errMsg } from "./util";

export function useTeams() {
  return useQuery({ queryKey: qk.teams.all, queryFn: api.listTeams });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createTeam(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.teams.all });
      toast.success("Team created");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useMembers(teamId: string | null) {
  return useQuery({
    queryKey: qk.teams.members(teamId ?? ""),
    queryFn: () => api.listMembers(teamId as string),
    enabled: Boolean(teamId),
  });
}

export function useAddMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      api.addMember(teamId, body.email, body.role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.teams.members(teamId) });
      toast.success("Member added or invited");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useUpdateMemberRole(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { userId: string; role: string }) =>
      api.updateMemberRole(teamId, body.userId, body.role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.teams.members(teamId) });
      toast.success("Role updated");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useRemoveMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeMember(teamId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.teams.members(teamId) });
      toast.success("Member removed");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
