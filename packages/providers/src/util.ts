import type { WebhookHeaders } from "@techno-deployer/core";

/** Case-insensitive header lookup returning the first value. */
export function firstHeader(headers: WebhookHeaders, name: string): string | undefined {
  const v = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(v) ? v[0] : v;
}
