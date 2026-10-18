import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Database connection.
 *
 * When the project runs outside Lovable (e.g. cloned from GitHub and deployed
 * elsewhere), set these environment variables at build time — see .env.example:
 *   VITE_SUPABASE_URL       e.g. https://pfniphvzvgmmghejwadl.supabase.co
 *   VITE_SUPABASE_ANON_KEY  the anon/public key from API settings
 * The literals below are the same values as fallbacks so the app also runs
 * without configuration. They are publishable credentials only; no service
 * role key or other secret may ever be placed here.
 */
export const SUPABASE_URL =
  import.meta.env["VITE_SUPABASE_URL"] ?? "https://pfniphvzvgmmghejwadl.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmbmlwaHZ6dmdtbWdoZWp3YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTY0MTMsImV4cCI6MjEwNzgzMjQxM30.fRcCvpvsPf4HVsLoSDagc7jNx09ASWSnTv9niPx0o6w";

if (import.meta.env.DEV && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn("ps43: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set; staff sign-in will fail.");
}

let client: SupabaseClient | undefined;
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: typeof window !== "undefined", autoRefreshToken: true },
    });
  }
  return client;
}

/**
 * Demo staff login, set at build time by scripts/build-dashboard.sh, so visitors skip the sign-in
 * screen. The data is fictional; the database views still only answer signed-in users.
 */
const DEMO_EMAIL: string | undefined = import.meta.env["VITE_DEMO_EMAIL"] || undefined;
const DEMO_PASSWORD: string | undefined = import.meta.env["VITE_DEMO_PASSWORD"] || undefined;
export const hasDemoLogin = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

/** The current session. With a demo login and no session, signs in with the demo account. */
export async function ensureSession(): Promise<Session | null> {
  const { data } = await db().auth.getSession();
  if (data.session || !DEMO_EMAIL || !DEMO_PASSWORD) return data.session;
  const res = await db().auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  return res.data.session ?? null;
}

export type Row = Record<string, unknown>;

/** Read the first present field among candidate column names. */
export function pick(row: Row | undefined, ...keys: string[]): unknown {
  if (!row) return undefined;
  for (const k of keys) if (row[k] !== undefined && row[k] !== null) return row[k];
  return undefined;
}
export const str = (r: Row | undefined, ...k: string[]) => {
  const v = pick(r, ...k);
  return v == null ? "" : String(v);
};
export const num = (r: Row | undefined, ...k: string[]) => {
  const v = pick(r, ...k);
  const n = typeof v === "number" ? v : v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const schoolId = (r: Row) => str(r, "school_id", "id");
export const schoolName = (r: Row) => str(r, "school_name", "name") || "Unnamed school";
export const region = (r: Row) => str(r, "region", "region_name");
export const condition = (r: Row) => str(r, "building_condition", "condition");
export const topNeed = (r: Row) => str(r, "top_need", "primary_need");
export const needScore = (r: Row) =>
  num(r, "need_score", "need_rank_score", "priority_score", "score", "need_rank");

/** Rank by need: higher score first; if the view exposes need_rank (1 = most), ascending. */
export function rankByNeed(rows: Row[]): Row[] {
  const usesRank = rows.some((r) => num(r, "need_rank") != null) && !rows.some((r) => num(r, "need_score") != null);
  return [...rows].sort((a, b) => {
    const x = usesRank ? num(a, "need_rank") : needScore(a);
    const y = usesRank ? num(b, "need_rank") : needScore(b);
    if (x == null && y == null) return schoolName(a).localeCompare(schoolName(b));
    if (x == null) return 1;
    if (y == null) return -1;
    return usesRank ? x - y : y - x;
  });
}

/** Approximate centres of Cameroon's 10 regions (fallback when the stats view has no coordinates). */
export const REGION_CENTRES: Record<string, [number, number]> = {
  adamawa: [7.0, 13.0], adamaoua: [7.0, 13.0], centre: [4.5, 11.8], center: [4.5, 11.8],
  east: [4.0, 14.2], est: [4.0, 14.2], "far north": [10.9, 14.4], "extreme north": [10.9, 14.4],
  "extrême-nord": [10.9, 14.4], littoral: [4.1, 10.0], north: [8.6, 13.9], nord: [8.6, 13.9],
  northwest: [6.2, 10.3], "north west": [6.2, 10.3], "north-west": [6.2, 10.3], "nord-ouest": [6.2, 10.3],
  west: [5.5, 10.5], ouest: [5.5, 10.5], south: [2.8, 11.5], sud: [2.8, 11.5],
  southwest: [5.0, 9.3], "south west": [5.0, 9.3], "south-west": [5.0, 9.3], "sud-ouest": [5.0, 9.3],
};
export function regionCentre(r: Row): [number, number] | null {
  const lat = num(r, "lat_display", "lat", "latitude", "centroid_lat", "center_lat");
  const lng = num(r, "lng_display", "lng", "lon", "longitude", "centroid_lng", "center_lng");
  if (lat != null && lng != null) return [lat, lng];
  return REGION_CENTRES[region(r).trim().toLowerCase()] ?? null;
}

/**
 * Parses a value for display. A calendar date ("2026-10-12", from a date column) is read as that
 * day in local time; `new Date("2026-10-12")` would be UTC midnight and show Oct 11 in Toronto.
 * Timestamps keep their time zone.
 */
export function parseDisplayDate(value: string): Date {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value);
}

export function fmtDate(v: unknown) {
  if (!v) return "";
  // Calendar dates ("2026-10-12") are read as local days, not UTC midnight (see parseDisplayDate).
  const d = parseDisplayDate(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}
export const label = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
