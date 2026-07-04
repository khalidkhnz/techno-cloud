import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookHeaders } from "@techno-deployer/core";

/** Case-insensitive header lookup returning the first value. */
export function firstHeader(headers: WebhookHeaders, name: string): string | undefined {
  const v = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(v) ? v[0] : v;
}

/** Constant-time string comparison (guards against timing attacks on secrets/signatures). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** `sha256=<hex>` HMAC of the raw body — the GitHub/Bitbucket signature format. */
export function hmacSha256Hex(rawBody: Uint8Array, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}
