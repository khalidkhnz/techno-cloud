/** Normalize an unknown thrown value into a user-facing message (strips the API prefix noise). */
export function errMsg(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  // "API 403: {json}" → keep it short
  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
}
