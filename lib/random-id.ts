/**
 * A random id that works everywhere.
 *
 * crypto.randomUUID() is restricted to secure contexts, so it is missing over
 * plain HTTP — a phone opening the dev server on the LAN, for instance — and
 * absent entirely from Safari before 15.4, which is still a real share of
 * iPhones in the UAE. Calling it unguarded throws a TypeError and takes down
 * whatever rendered it.
 *
 * Used for analytics session ids and React list keys: things that must be
 * unique, but are never credentials. The final fallback is deliberately not
 * cryptographic, because having an id at all matters more than its entropy.
 * Do not use this for anything security-bearing.
 */
export function randomId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;

  if (typeof c?.randomUUID === "function") return c.randomUUID();

  if (typeof c?.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
