// Verifies the dashboard contract (AGENTS.md section 7) against the linked project
// using only the ANON key, exactly as the Lovable dashboard would.
// Run: npx tsx scripts/verify-contract.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.ts";

const env = loadEnv(["SUPABASE_URL", "SUPABASE_ANON_KEY", "DEMO_STAFF_EMAIL", "DEMO_STAFF_PASSWORD"]);

const VIEW_COLUMNS: Record<string, string[]> = {
  dashboard_schools: [
    "id", "name", "region_code", "region_name", "town", "is_sensitive", "lat_display", "lng_display",
    "assessment_count", "last_submitted_at", "latest_assessment_id", "enrollment_band", "building_condition",
    "power_source", "connectivity", "devices", "top_need", "verified",
  ],
  dashboard_assessments: [
    "id", "ref_code", "school_id", "school_name", "region_code", "region_name", "is_sensitive", "reporter_role",
    "reporter_last4", "language", "enrollment_band", "building_condition", "power_source", "connectivity",
    "devices", "top_need", "notes", "verified", "submitted_at", "reporter_channel",
  ],
  dashboard_region_stats: [
    "region_code", "region_name", "centroid_lat", "centroid_lng", "is_sensitive", "school_count", "unsafe_count",
    "no_power_count", "top_need", "last_submitted_at",
  ],
  dashboard_media: ["id", "assessment_id", "school_id", "type", "storage_path", "created_at"],
  // Prototype pipeline views (B, C, D).
  dashboard_readiness: [
    "school_id", "school_name", "region_code", "region_name", "is_sensitive", "latest_assessment_id",
    "building_points", "power_points", "connectivity_points", "devices_points", "score", "tier", "safety_first",
  ],
  dashboard_partners: [
    "id", "name", "type", "region_code", "region_name", "town", "services", "trust_level", "projects_completed",
    "referred_by_id", "referred_by_name", "joined_at",
  ],
  dashboard_partner_matches: [
    "school_id", "partner_id", "partner_name", "partner_type", "trust_level", "projects_completed", "same_region",
    "need", "match_rank",
  ],
  dashboard_projects: [
    "id", "school_id", "school_name", "region_code", "region_name", "is_sensitive", "partner_id", "partner_name",
    "title", "intervention", "tier", "status", "budget_usd", "started_at", "completed_at", "milestones_total",
    "milestones_done",
  ],
  dashboard_milestones: [
    "id", "project_id", "school_id", "sort_order", "title", "status", "due_date", "completed_at", "photo_path", "verified",
  ],
  dashboard_attendance: [
    "school_id", "school_name", "region_code", "week_start", "students_present", "students_enrolled", "attendance_rate",
  ],
  dashboard_impact_summary: [
    "school_count", "assessment_count", "verified_count", "partner_count", "proven_partner_count", "projects_planned",
    "projects_in_progress", "projects_completed", "students_reached", "attendance_before", "attendance_after",
  ],
};

const RAW_TABLES = [
  "schools", "reporters", "assessments", "sessions", "media", "messages", "processed_messages", "regions",
  "partners", "projects", "milestones", "attendance_reports",
];

type Status = "PASS" | "FAIL" | "WARN";
const results: { status: Status; name: string; detail?: string }[] = [];

function record(status: Status, name: string, detail?: string): void {
  results.push({ status, name, ...(detail ? { detail } : {}) });
  console.log(`  ${status}  ${name}${detail ? `  (${detail})` : ""}`);
}

function newClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const isOneDecimal = (n: number) => Math.abs(Math.round(n * 10) / 10 - n) < 1e-9;

async function checkStaff(): Promise<void> {
  console.log("\nAs demo staff (anon key + signed in):");
  const staff = newClient();
  const { error: signInError } = await staff.auth.signInWithPassword({
    email: env.DEMO_STAFF_EMAIL,
    password: env.DEMO_STAFF_PASSWORD,
  });
  if (signInError) {
    record("FAIL", "sign in as demo staff", signInError.message);
    return;
  }
  record("PASS", "sign in as demo staff");

  // Views: rows exist and columns match exactly.
  for (const [view, expected] of Object.entries(VIEW_COLUMNS)) {
    const { data, error } = await staff.from(view).select("*").limit(1000);
    if (error) {
      record("FAIL", `${view} readable`, error.message);
      continue;
    }
    if (!data || data.length === 0) {
      record("FAIL", `${view} returns rows`, "0 rows");
      continue;
    }
    const actual = Object.keys(data[0] as object);
    const missing = expected.filter((c) => !actual.includes(c));
    const extra = actual.filter((c) => !expected.includes(c));
    if (missing.length || extra.length) {
      record("FAIL", `${view} columns`, `missing: [${missing.join(", ")}] extra: [${extra.join(", ")}]`);
    } else {
      record("PASS", `${view}: ${data.length} rows, ${expected.length} columns match`);
    }
  }

  // Privacy: coordinates.
  const { data: schools, error: schoolsError } = await staff
    .from("dashboard_schools")
    .select("name, is_sensitive, lat_display, lng_display");
  if (schoolsError || !schools) {
    record("FAIL", "load schools for privacy checks", schoolsError?.message);
  } else {
    const sensitive = schools.filter((s) => s.is_sensitive);
    const leaking = sensitive.filter((s) => s.lat_display !== null || s.lng_display !== null);
    if (sensitive.length === 0) record("FAIL", "sensitive schools present to test", "none found");
    else if (leaking.length) record("FAIL", "sensitive schools have null coordinates", `${leaking.length} leak coordinates`);
    else record("PASS", `sensitive schools have null coordinates (${sensitive.length} checked)`);

    const open = schools.filter((s) => !s.is_sensitive && s.lat_display !== null);
    const badRounding = open.filter((s) => !isOneDecimal(s.lat_display as number) || !isOneDecimal(s.lng_display as number));
    if (open.length === 0) record("FAIL", "non-sensitive schools have coordinates", "none found");
    else if (badRounding.length) record("FAIL", "coordinates rounded to 1 decimal", `${badRounding.length} not rounded`);
    else record("PASS", `non-sensitive coordinates rounded to 1 decimal (${open.length} checked)`);
  }

  const { data: regions } = await staff.from("dashboard_region_stats").select("region_code");
  if (regions?.length === 10) record("PASS", "dashboard_region_stats has all 10 regions");
  else record("FAIL", "dashboard_region_stats has all 10 regions", `got ${regions?.length ?? 0}`);

  // Raw tables are denied.
  for (const table of RAW_TABLES) {
    const { data, error } = await staff.from(table).select("*").limit(1);
    if (error) record("PASS", `raw table ${table} denied`, error.code ?? undefined);
    else record("FAIL", `raw table ${table} denied`, `returned ${data?.length ?? 0} rows`);
  }

  // RPC: flip verified, confirm, flip back.
  const { data: target } = await staff.from("dashboard_assessments").select("id, verified").limit(1).single();
  if (!target) {
    record("FAIL", "set_assessment_verified", "no assessment to test with");
  } else {
    const original = target.verified as boolean;
    const flip = await staff.rpc("set_assessment_verified", { assessment_id: target.id, verified: !original });
    const { data: after } = await staff.from("dashboard_assessments").select("verified").eq("id", target.id).single();
    const restore = await staff.rpc("set_assessment_verified", { assessment_id: target.id, verified: original });
    const { data: restored } = await staff.from("dashboard_assessments").select("verified").eq("id", target.id).single();
    if (flip.error) record("FAIL", "set_assessment_verified updates", flip.error.message);
    else if (after?.verified !== !original) record("FAIL", "set_assessment_verified updates", "value did not change");
    else if (restore.error || restored?.verified !== original) record("FAIL", "set_assessment_verified restore", restore.error?.message);
    else record("PASS", "set_assessment_verified flips and restores verified");

    const missing = await staff.rpc("set_assessment_verified", {
      assessment_id: "00000000-0000-0000-0000-000000000000",
      verified: true,
    });
    if (missing.error) record("PASS", "set_assessment_verified rejects unknown id");
    else record("FAIL", "set_assessment_verified rejects unknown id", "no error");
  }

  // Storage: signed URL read works, write is denied.
  const { data: media } = await staff.from("dashboard_media").select("storage_path").limit(1).single();
  if (!media) {
    record("FAIL", "storage signed URL", "no media row");
  } else {
    const { data: signed, error } = await staff.storage.from("field-media").createSignedUrl(media.storage_path as string, 60);
    if (error || !signed) {
      record("FAIL", "staff can create signed URL", error?.message);
    } else {
      const res = await fetch(signed.signedUrl);
      if (res.ok) record("PASS", "staff can create and fetch a signed URL", `HTTP ${res.status}`);
      else record("FAIL", "staff can fetch signed URL", `HTTP ${res.status}`);
    }
  }
  const upload = await staff.storage
    .from("field-media")
    .upload(`verify/should-not-exist-${Date.now()}.png`, new Uint8Array([0x89, 0x50]), { contentType: "image/png" });
  if (upload.error) record("PASS", "staff cannot upload to field-media");
  else record("FAIL", "staff cannot upload to field-media", "upload succeeded");

  await staff.auth.signOut();
}

async function checkAnon(): Promise<void> {
  console.log("\nAs anon (no user):");
  const anon = newClient();
  for (const view of Object.keys(VIEW_COLUMNS)) {
    const { data, error } = await anon.from(view).select("*").limit(1);
    if (error) record("PASS", `${view} denied`, error.code ?? undefined);
    else record("FAIL", `${view} denied`, `returned ${data?.length ?? 0} rows`);
  }
  for (const table of ["schools", "reporters", "assessments"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    if (error) record("PASS", `raw table ${table} denied`, error.code ?? undefined);
    else record("FAIL", `raw table ${table} denied`, `returned ${data?.length ?? 0} rows`);
  }
  const rpc = await anon.rpc("set_assessment_verified", {
    assessment_id: "00000000-0000-0000-0000-000000000000",
    verified: true,
  });
  if (rpc.error) record("PASS", "set_assessment_verified denied", rpc.error.code ?? undefined);
  else record("FAIL", "set_assessment_verified denied", "call succeeded");

  const list = await anon.storage.from("field-media").list("seed", { limit: 1 });
  if (list.error || (list.data ?? []).length === 0) record("PASS", "field-media not listable");
  else record("FAIL", "field-media not listable", `listed ${list.data.length} objects`);

  // Signups must be disabled, or anyone with the anon key could become "authenticated".
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: env.SUPABASE_ANON_KEY } });
    const settings = (await res.json()) as { disable_signup?: boolean };
    if (settings.disable_signup === true) record("PASS", "public signups disabled");
    else
      record(
        "WARN",
        "public signups are ENABLED",
        "anyone with the anon key can create an account and read the dashboard views. Disable in Auth > Providers > Email",
      );
  } catch (err) {
    record("WARN", "could not read auth settings", err instanceof Error ? err.message : String(err));
  }
}

async function main(): Promise<void> {
  console.log("Pont dashboard contract verification");
  await checkStaff();
  await checkAnon();

  const fails = results.filter((r) => r.status === "FAIL");
  const warns = results.filter((r) => r.status === "WARN");
  const passes = results.filter((r) => r.status === "PASS");
  console.log(`\nResult: ${passes.length} passed, ${fails.length} failed, ${warns.length} warnings`);
  if (fails.length) {
    console.log("FAILED:");
    for (const f of fails) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
  console.log(warns.length ? "Contract OK, but see warnings above." : "Contract OK.");
}

main().catch((err: unknown) => {
  console.error("Verification crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
