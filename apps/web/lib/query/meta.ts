"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Master data (targets, providers, roles, environment kinds) — rarely changes, cache long. */
export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: api.getMeta,
    staleTime: 5 * 60 * 1000,
  });
}
