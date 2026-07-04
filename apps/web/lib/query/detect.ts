"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { errMsg } from "./util";

/** Inspect a repo and detect its framework + build plan (create-flow "Analyze"). */
export function useDetectRepo() {
  return useMutation({
    mutationFn: (body: { provider: string; repo: string; ref?: string; token?: string }) =>
      api.detectRepo(body),
    onError: (e) => toast.error(errMsg(e)),
  });
}
