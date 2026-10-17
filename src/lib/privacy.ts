// Shared privacy utilities. Anything touching phone numbers or coordinates goes through here.
// Uses only Web Crypto and standard JS so it runs in Node, Vitest and Deno (Edge Functions).

const E164 = /^\+[1-9]\d{6,14}$/;

function assertE164(e164: string): void {
  if (!E164.test(e164)) {
    throw new Error("Phone number must be in E.164 format, e.g. +237690000000");
  }
}

/** Salted SHA-256 of an E.164 phone number, as lowercase hex. */
export async function hashPhone(e164: string, salt: string): Promise<string> {
  assertE164(e164);
  if (!salt) throw new Error("A non-empty salt is required to hash phone numbers");
  const data = new TextEncoder().encode(salt + e164);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Last 4 digits of an E.164 phone number. */
export function last4(e164: string): string {
  assertE164(e164);
  return e164.slice(-4);
}

/**
 * Round a coordinate to 1 decimal place (about 11 km).
 * Rounds half away from zero to match Postgres round(numeric, 1) used in the dashboard views.
 */
export function roundCoord(n: number): number {
  if (!Number.isFinite(n)) throw new Error("Coordinate must be a finite number");
  const rounded = (Math.sign(n) * Math.round(Math.abs(n) * 10 + Number.EPSILON)) / 10;
  return rounded === 0 ? 0 : rounded;
}
