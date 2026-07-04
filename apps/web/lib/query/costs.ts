"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "./keys";
import { errMsg } from "./util";

export function useMeters() {
  return useQuery({ queryKey: qk.costs.meters, queryFn: api.getMeters });
}

export function useMeterAlerts() {
  return useQuery({ queryKey: qk.costs.meterAlerts, queryFn: api.getMeterAlerts });
}

export function useCostSnapshots() {
  return useQuery({ queryKey: qk.costs.snapshots, queryFn: api.getCostSnapshots });
}

export function useCostAdvice() {
  return useQuery({ queryKey: qk.costs.advice, queryFn: api.getCostAdvice });
}

export function useEstimates() {
  return useQuery({ queryKey: qk.costs.estimates, queryFn: api.getEstimates });
}

export function useBudgets() {
  return useQuery({ queryKey: qk.costs.budgets, queryFn: api.getBudgets });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { scope: string; refId?: string; thresholdUsd: number }) =>
      api.createBudget(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.costs.budgets });
      toast.success("Budget set");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.costs.budgets });
      toast.success("Budget removed");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
