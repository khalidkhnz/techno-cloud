"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { errMsg } from "./util";

/** Inspect a repo and detect its framework + build plan (create-flow "Analyze"). */
export function useDetectRepo() {
  return useMutation({
    mutationFn: (body: {
      provider: string;
      repo: string;
      ref?: string;
      token?: string;
      subdir?: string;
    }) => api.detectRepo(body),
    onError: (e) => toast.error(errMsg(e)),
  });
}

/** Read an existing EC2 instance's live Nginx config (to diff against the append). */
export function useInstanceNginx() {
  return useMutation({
    mutationFn: (body: { instanceId: string; port?: number; serverName?: string }) =>
      api.getInstanceNginx(body),
    onError: (e) => toast.error(errMsg(e)),
  });
}
