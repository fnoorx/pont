// npm run seed: wipe app data (not regions) and reseed fictional demo data.
// Safe to run repeatedly. Uses the service role key, so never run it from the dashboard.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hashPhone, last4 } from "../src/lib/privacy.ts";
import { loadEnv } from "./env.ts";
import { placeholderBuildingPng } from "./lib/placeholderPng.ts";
import { PARTNERS, PROJECTS, REPORTERS, SCHOOLS, type EnrollmentBand } from "./seed-data.ts";

const BUCKET = "field-media";

const env = loadEnv([
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PHONE_HASH_SALT",
  "DEMO_STAFF_EMAIL",
  "DEMO_STAFF_PASSWORD",
]);

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Result<T> = { data: T | null; error: { message: string } | null };

/** Throws on error and returns the rows. */
function check<T>(label: string, result: Result<T>): NonNullable<T> {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${label}: no data returned`);
  return result.data as NonNullable<T>;
}

/** Throws on error, for writes that return nothing. */
function ok(label: string, result: Result<unknown>): void {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
}

/** Small deterministic PRNG so exact coordinates are stable across reseeds. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function wipe(client: SupabaseClient): Promise<void> {
  // Remove stored files for existing media rows, then anything left under seed/ and pending/.
  const media = check("list media", await client.from("media").select("storage_path"));
  const paths = new Set(media.map((m) => m.storage_path as string));
  for (const prefix of ["seed", "pending"]) {
    const { data: folders } = await client.storage.from(BUCKET).list(prefix, { limit: 1000 });
    for (const folder of folders ?? []) {
      const { data: files } = await client.storage.from(BUCKET).list(`${prefix}/${folder.name}`, { limit: 1000 });
      for (const f of files ?? []) paths.add(`${prefix}/${folder.name}/${f.name}`);
    }
  }
  if (paths.size > 0) {
    const { error } = await client.storage.from(BUCKET).remove([...paths]);
    if (error) throw new Error(`remove storage objects: ${error.message}`);
  }

  // Children first. Regions are reference data and are never touched.
  ok("wipe milestones", await client.from("milestones").delete().not("id", "is", null));
  ok("wipe projects", await client.from("projects").delete().not("id", "is", null));
  ok("wipe attendance_reports", await client.from("attendance_reports").delete().not("id", "is", null));
  ok("wipe partners", await client.from("partners").delete().not("id", "is", null));
  ok("wipe media", await client.from("media").delete().not("id", "is", null));
  ok("wipe assessments", await client.from("assessments").delete().not("id", "is", null));
  ok("wipe schools", await client.from("schools").delete().not("id", "is", null));
  ok("wipe sessions", await client.from("sessions").delete().not("id", "is", null));
  ok("wipe messages", await client.from("messages").delete().not("id", "is", null));
  ok("wipe processed_messages", await client.from("processed_messages").delete().not("message_sid", "is", null));
  ok("wipe reporters", await client.from("reporters").delete().not("id", "is", null));
}

async function upsertDemoStaff(client: SupabaseClient): Promise<"created" | "updated"> {
  const email = env.DEMO_STAFF_EMAIL.toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list users: ${error.message}`);
    const existing = data.users.find((u) => u.email?.toLowerCase() === email);
    if (existing) {
      const res = await client.auth.admin.updateUserById(existing.id, {
        password: env.DEMO_STAFF_PASSWORD,
        email_confirm: true,
      });
      if (res.error) throw new Error(`update demo staff user: ${res.error.message}`);
      return "updated";
    }
    if (data.users.length < 1000) break;
  }
  const res = await client.auth.admin.createUser({
    email,
    password: env.DEMO_STAFF_PASSWORD,
    email_confirm: true,
    user_metadata: { role: "staff", demo: true },
  });
  if (res.error) throw new Error(`create demo staff user: ${res.error.message}`);
  return "created";
}

const DAY = 86_400_000;
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const ENROLLED: Record<EnrollmentBand, number> = { lt100: 80, "100_300": 220, "300_600": 450, gt600: 750 };

/** Mock data for Match (C) and Deliver/Prove (D). Returns counts for the summary. */
async function seedPipeline(
  client: SupabaseClient,
  schoolIdByName: Map<string, string>,
  rand: () => number,
  now: number,
): Promise<{ partners: number; projects: number; milestones: number; attendance: number; photos: number }> {
  // Partners: insert, then link referrals.
  const partners = check(
    "insert partners",
    await client
      .from("partners")
      .insert(
        PARTNERS.map((p) => ({
          name: p.name,
          type: p.type,
          region_code: p.region,
          town: p.town,
          services: p.services,
          trust_level: p.trust,
          projects_completed: p.projectsCompleted,
          joined_at: new Date(now - p.joinedDaysAgo * DAY).toISOString(),
        })),
      )
      .select("id, name"),
  );
  const partnerIdByKey = new Map(PARTNERS.map((p) => [p.key, partners.find((r) => r.name === p.name)!.id as string]));
  for (const p of PARTNERS.filter((x) => x.referredBy)) {
    ok(
      `link referral ${p.key}`,
      await client.from("partners").update({ referred_by: partnerIdByKey.get(p.referredBy!) }).eq("id", partnerIdByKey.get(p.key)!),
    );
  }

  // Projects and milestones.
  let milestoneCount = 0;
  let photoCount = 0;
  for (const [pi, p] of PROJECTS.entries()) {
    const schoolId = schoolIdByName.get(p.school);
    if (!schoolId) throw new Error(`Project school not found: ${p.school}`);
    const project: { id: string } = check(
      `insert project ${p.title}`,
      await client
        .from("projects")
        .insert({
          school_id: schoolId,
          partner_id: partnerIdByKey.get(p.partner),
          title: p.title,
          intervention: p.intervention,
          tier: p.tier,
          status: p.status,
          budget_usd: p.budgetUsd,
          started_at: p.startedDaysAgo !== undefined ? isoDate(now - p.startedDaysAgo * DAY) : null,
          completed_at: p.completedDaysAgo !== undefined ? isoDate(now - p.completedDaysAgo * DAY) : null,
        })
        .select("id")
        .single(),
    );
    const rows = [];
    for (const [mi, m] of p.milestones.entries()) {
      let photoPath: string | null = null;
      if (m.photo) {
        photoPath = `seed/milestones/${pi}-${mi}-placeholder.png`;
        const { error } = await client.storage
          .from(BUCKET)
          .upload(photoPath, placeholderBuildingPng(pi + mi), { contentType: "image/png", upsert: true });
        if (error) throw new Error(`upload ${photoPath}: ${error.message}`);
        photoCount++;
      }
      rows.push({
        project_id: project.id,
        sort_order: mi + 1,
        title: m.title,
        status: m.done ? "done" : "pending",
        due_date: isoDate(now + m.dueInDays * DAY),
        completed_at: m.completedDaysAgo !== undefined ? isoDate(now - m.completedDaysAgo * DAY) : null,
        photo_path: photoPath,
        verified: m.verified ?? false,
      });
    }
    ok(`insert milestones ${p.title}`, await client.from("milestones").insert(rows));
    milestoneCount += rows.length;
  }

  // Weekly attendance (aggregate counts) for the last 12 weeks at schools with active or finished projects.
  // Attendance climbs after a completed project, and drifts up slowly while one is in progress.
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const attendanceRows = [];
  const tracked = new Map<string, { completedAt: number | null; inProgress: boolean }>();
  for (const p of PROJECTS.filter((x) => x.status !== "planned")) {
    const prev = tracked.get(p.school);
    const completedAt = p.completedDaysAgo !== undefined ? now - p.completedDaysAgo * DAY : null;
    tracked.set(p.school, {
      completedAt: prev?.completedAt ?? completedAt,
      inProgress: (prev?.inProgress ?? false) || p.status === "in_progress",
    });
  }
  for (const [schoolName, info] of tracked) {
    const school = SCHOOLS.find((s) => s.name === schoolName)!;
    const latest = school.assessments.reduce((a, b) => (a.daysAgo < b.daysAgo ? a : b));
    const enrolled = ENROLLED[latest.enrollment];
    const baseline = 0.6 + rand() * 0.08;
    for (let w = 11; w >= 0; w--) {
      const weekStart = monday.getTime() - w * 7 * DAY;
      let rate = baseline;
      if (info.completedAt !== null && weekStart >= info.completedAt) rate = baseline + 0.18 + rand() * 0.04;
      else if (info.inProgress) rate = baseline + (11 - w) * 0.006;
      rate = Math.min(0.97, rate + (rand() - 0.5) * 0.04);
      attendanceRows.push({
        school_id: schoolIdByName.get(schoolName),
        week_start: isoDate(weekStart),
        students_present: Math.round(enrolled * rate),
        students_enrolled: enrolled,
      });
    }
  }
  ok("insert attendance", await client.from("attendance_reports").insert(attendanceRows));

  return {
    partners: partners.length,
    projects: PROJECTS.length,
    milestones: milestoneCount,
    attendance: attendanceRows.length,
    photos: photoCount,
  };
}

async function main(): Promise<void> {
  console.log("Wiping app data (regions are kept)...");
  await wipe(db);

  console.log("Seeding reporters...");
  const now = Date.now();
  const reporterRows = await Promise.all(
    REPORTERS.map(async (r, i) => ({
      phone_e164: r.phone,
      phone_hash: await hashPhone(r.phone, env.PHONE_HASH_SALT),
      phone_last4: last4(r.phone),
      channel: r.channel,
      language: r.language,
      role: r.role,
      consent_at: new Date(now - (70 - i) * 86_400_000).toISOString(),
      created_at: new Date(now - (70 - i) * 86_400_000).toISOString(),
    })),
  );
  const reporters = check("insert reporters", await db.from("reporters").insert(reporterRows).select("id"));
  const reporterIds = reporters.map((r) => r.id as string);

  console.log("Seeding schools...");
  const rand = mulberry32(43);
  const schoolRows = SCHOOLS.map((s) => {
    const oldest = Math.max(...s.assessments.map((a) => a.daysAgo));
    // Up to about 4 km from the town centre.
    return {
      name: s.name,
      region_code: s.region,
      town: s.town,
      lat_exact: Number((s.lat + (rand() - 0.5) * 0.07).toFixed(5)),
      lng_exact: Number((s.lng + (rand() - 0.5) * 0.07).toFixed(5)),
      created_at: new Date(now - oldest * 86_400_000 - 3_600_000).toISOString(),
    };
  });
  const schools = check("insert schools", await db.from("schools").insert(schoolRows).select("id, name"));
  const schoolIdByName = new Map(schools.map((s) => [s.name as string, s.id as string]));

  console.log("Seeding assessments...");
  const assessmentRows = SCHOOLS.flatMap((s) =>
    s.assessments.map((a) => {
      const reporterId = reporterIds[a.reporter];
      if (!reporterId) throw new Error(`Unknown reporter index ${a.reporter} for ${s.name}`);
      return {
        school_id: schoolIdByName.get(s.name)!,
        reporter_id: reporterId,
        enrollment_band: a.enrollment,
        building_condition: a.building,
        power_source: a.power,
        connectivity: a.connectivity,
        devices: a.devices,
        top_need: a.need,
        notes: a.notes ?? null,
        verified: a.verified,
        // Spread submissions across the day so ordering is realistic.
        submitted_at: new Date(now - a.daysAgo * 86_400_000 - Math.floor(rand() * 8) * 3_600_000).toISOString(),
      };
    }),
  );
  // ref_code is generated by the database default.
  const assessments = check(
    "insert assessments",
    await db.from("assessments").insert(assessmentRows).select("id, school_id, submitted_at"),
  );
  const assessmentKey = (schoolId: string, submittedAt: string) => `${schoolId}|${new Date(submittedAt).getTime()}`;
  const assessmentIdByKey = new Map(
    assessments.map((a) => [assessmentKey(a.school_id as string, a.submitted_at as string), a.id as string]),
  );

  console.log("Uploading placeholder building photos...");
  const photoAssessmentIds = SCHOOLS.flatMap((s) => s.assessments).flatMap((a, i) => {
    if (!a.photo) return [];
    const row = assessmentRows[i]!;
    const id = assessmentIdByKey.get(assessmentKey(row.school_id, row.submitted_at));
    if (!id) throw new Error(`Could not find inserted assessment for photo #${i}`);
    return [id];
  });
  const mediaRows: { assessment_id: string; type: "photo"; storage_path: string }[] = [];
  for (const [n, assessmentId] of photoAssessmentIds.entries()) {
    const path = `seed/${assessmentId}/placeholder-building.png`;
    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, placeholderBuildingPng(n), { contentType: "image/png", upsert: true });
    if (error) throw new Error(`upload ${path}: ${error.message}`);
    mediaRows.push({ assessment_id: assessmentId, type: "photo", storage_path: path });
  }
  ok("insert media", await db.from("media").insert(mediaRows));

  console.log("Seeding partners, projects, milestones and attendance (prototype mock data)...");
  const pipeline = await seedPipeline(db, schoolIdByName, rand, now);

  console.log("Creating demo staff user...");
  const staff = await upsertDemoStaff(db);

  const regions = new Set(SCHOOLS.map((s) => s.region));
  const verifiedCount = assessmentRows.filter((a) => a.verified).length;
  console.log("");
  console.log("Seed complete:");
  console.log(`  reporters:   ${reporterIds.length}`);
  console.log(`  schools:     ${schools.length} across ${regions.size} regions`);
  console.log(`  assessments: ${assessments.length} (${verifiedCount} verified, ${assessments.length - verifiedCount} unverified)`);
  console.log(`  media:       ${mediaRows.length} placeholder photos`);
  console.log(`  partners:    ${pipeline.partners}`);
  console.log(`  projects:    ${pipeline.projects} with ${pipeline.milestones} milestones (${pipeline.photos} placeholder photos)`);
  console.log(`  attendance:  ${pipeline.attendance} weekly reports`);
  console.log(`  demo staff:  ${staff} (email confirmed)`);
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
