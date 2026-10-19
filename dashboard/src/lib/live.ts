// Live data from the Pont database (repo: github.com/fnoorx/pont).
// Read only from the dashboard_* views, plus the one write: set_assessment_verified.
// Column names and value sets follow docs/DASHBOARD_CONTRACT.md in that repo.
import { db, parseDisplayDate } from "@/lib/ps43";

// ---------------------------------------------------------------------------
// Row types (one per view)
// ---------------------------------------------------------------------------

export type Tier = "tier0" | "tier1" | "tier2";

export interface School {
  id: string;
  name: string;
  region_code: string;
  region_name: string;
  town: string | null;
  is_sensitive: boolean;
  lat_display: number | null;
  lng_display: number | null;
  assessment_count: number;
  last_submitted_at: string | null;
  latest_assessment_id: string | null;
  enrollment_band: string | null;
  building_condition: string | null;
  power_source: string | null;
  connectivity: string | null;
  devices: string | null;
  top_need: string | null;
  verified: boolean | null;
}

export interface Assessment {
  id: string;
  ref_code: string;
  school_id: string;
  school_name: string;
  region_code: string;
  region_name: string;
  is_sensitive: boolean;
  reporter_role: string | null;
  reporter_last4: string | null;
  language: string | null;
  enrollment_band: string;
  building_condition: string;
  power_source: string;
  connectivity: string;
  devices: string;
  top_need: string;
  notes: string | null;
  verified: boolean;
  submitted_at: string;
  reporter_channel: string | null;
}

export interface RegionStat {
  region_code: string;
  region_name: string;
  centroid_lat: number;
  centroid_lng: number;
  is_sensitive: boolean;
  school_count: number;
  unsafe_count: number;
  no_power_count: number;
  top_need: string | null;
  last_submitted_at: string | null;
}

export interface Media {
  id: string;
  assessment_id: string;
  school_id: string;
  type: "photo" | "audio";
  storage_path: string;
  created_at: string;
}

export interface Readiness {
  school_id: string;
  school_name: string;
  region_code: string;
  region_name: string;
  is_sensitive: boolean;
  latest_assessment_id: string;
  building_points: number;
  power_points: number;
  connectivity_points: number;
  devices_points: number;
  score: number;
  tier: Tier;
  safety_first: boolean;
  tier_capped: boolean;
  stated_need: string;
  blocked_by: string | null;
  recommended_need: string;
  package: string[];
}

export interface Priority {
  school_id: string;
  school_name: string;
  region_code: string;
  region_name: string;
  is_sensitive: boolean;
  readiness_score: number;
  tier: Tier;
  stated_need: string;
  recommended_need: string;
  blocked_by: string | null;
  enrollment_band: string | null;
  verified: boolean | null;
  need_points: number;
  safety_points: number;
  size_points: number;
  verified_points: number;
  priority: number;
  priority_rank: number;
}

export interface Partner {
  id: string;
  name: string;
  type: string;
  region_code: string | null;
  region_name: string | null;
  town: string | null;
  services: string[];
  trust_level: "new" | "referred" | "proven";
  projects_completed: number;
  referred_by_id: string | null;
  referred_by_name: string | null;
  joined_at: string;
}

export interface Match {
  school_id: string;
  partner_id: string;
  partner_name: string;
  partner_type: string;
  trust_level: "new" | "referred" | "proven";
  projects_completed: number;
  same_region: boolean;
  need: string;
  match_rank: number;
  covers: string[];
  covers_full_package: boolean;
}

export type ProjectStatus = "planned" | "in_progress" | "completed";

export interface Project {
  id: string;
  school_id: string;
  school_name: string;
  region_code: string;
  region_name: string;
  is_sensitive: boolean;
  partner_id: string | null;
  partner_name: string | null;
  title: string;
  intervention: string;
  tier: Tier;
  status: ProjectStatus;
  budget_usd: number | null;
  started_at: string | null;
  completed_at: string | null;
  milestones_total: number;
  milestones_done: number;
  /** Short code partners send from the chat, e.g. "DONE PJ-104". */
  code: string | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  school_id: string;
  sort_order: number;
  title: string;
  status: "pending" | "done";
  due_date: string | null;
  completed_at: string | null;
  photo_path: string | null;
  verified: boolean;
  /** True when a partner reported it done from the chat. */
  reported_via_chat: boolean;
}

export interface Attendance {
  school_id: string;
  school_name: string;
  region_code: string;
  week_start: string;
  students_present: number;
  students_enrolled: number;
  attendance_rate: number;
}

/** One row per assessed school. Costs are rough estimates per need, to confirm with partners. */
export interface PackageCost {
  school_id: string;
  school_name: string;
  region_code: string;
  region_name: string;
  is_sensitive: boolean;
  tier: Tier;
  stated_need: string;
  recommended_need: string;
  package: string[];
  first_step_cost_usd: number | null;
  package_cost_usd: number;
  priority_rank: number | null;
}

export type ResourceKind = "equipment" | "funding" | "expertise";

/** Equipment, funding or expertise PS43 could deploy (fictional demo data). */
export interface Resource {
  id: string;
  name: string;
  kind: ResourceKind;
  /** NULL = any need (unrestricted funding). */
  need: string | null;
  quantity: number | null;
  unit: string | null;
  value_usd: number | null;
  location: string | null;
  provider: string;
  schools_wanting: number;
  schools_ready: number;
  schools_blocked: number;
  unlock_need: string | null;
  unlock_cost_usd: number;
}

export interface ImpactSummary {
  school_count: number;
  assessment_count: number;
  verified_count: number;
  partner_count: number;
  proven_partner_count: number;
  projects_planned: number;
  projects_in_progress: number;
  projects_completed: number;
  students_reached: number;
  attendance_before: number | null;
  attendance_after: number | null;
}

// ---------------------------------------------------------------------------
// Labels (from the contract's value sets)
// ---------------------------------------------------------------------------

const LABELS: Record<string, Record<string, string>> = {
  enrollment_band: { lt100: "Under 100", "100_300": "100 to 300", "300_600": "300 to 600", gt600: "Over 600" },
  building_condition: { good: "Good", needs_repair: "Needs repairs", unsafe: "Unsafe or no roof" },
  power_source: {
    grid_reliable: "Reliable grid",
    grid_unreliable: "Unreliable grid",
    solar: "Solar",
    generator: "Generator",
    none: "No electricity",
  },
  connectivity: { good: "Good signal", weak: "Weak signal", none: "No signal" },
  devices: { none: "No devices", few: "A few devices", enough: "Enough devices" },
  need: {
    building: "Building repairs",
    furniture: "Desks and furniture",
    supplies: "Books and supplies",
    power: "Power",
    computers: "Computers",
    internet: "Internet",
    training: "Teacher training",
    other: "Other",
  },
  role: { headteacher: "Headteacher", teacher: "Teacher", partner: "Local partner", community: "Community member" },
  channel: { whatsapp: "WhatsApp", sms: "SMS", web: "Web chat" },
  language: { en: "English", fr: "Français" },
  partner_type: { ngo: "NGO", community_org: "Community group", contractor: "Contractor", supplier: "Supplier" },
  trust: { new: "New", referred: "Referred", proven: "Proven" },
  project_status: { planned: "Planned", in_progress: "In progress", completed: "Completed" },
  milestone_status: { pending: "Pending", done: "Done" },
  blocked_by: { building: "a safe building", power: "power", devices: "devices", signal: "mobile signal (or satellite)" },
  tier: { tier0: "Tier 0 · Foundations", tier1: "Tier 1 · Offline digital", tier2: "Tier 2 · Connected" },
  resource_kind: { equipment: "Equipment", funding: "Funding", expertise: "Expertise" },
};

export type LabelSet = keyof typeof LABELS;

export function label(set: LabelSet, value: string | null | undefined): string {
  if (!value) return "Unknown";
  return LABELS[set]?.[value] ?? value;
}

export const TIER_ADVICE: Record<Tier, string> = {
  tier0: "Safe classrooms first: repairs, desks, books and supplies. Learning materials that need no power.",
  tier1: "Solar power and an offline content server with shared tablets. No internet needed.",
  tier2: "Computer lab, internet and teacher training.",
};

// ---------------------------------------------------------------------------
// Pure helpers (unit tested)
// ---------------------------------------------------------------------------

/** "Asked for computers · needs power first", or null when nothing blocks the stated need. */
export function blockedBadge(r: Pick<Readiness, "stated_need" | "blocked_by">): string | null {
  if (!r.blocked_by) return null;
  return `Asked for ${label("need", r.stated_need).toLowerCase()} · needs ${label("blocked_by", r.blocked_by)} first`;
}

/** Whole US dollars, e.g. 7000 -> "$7,000". */
export function usd(n: number | null | undefined): string {
  return n == null ? "n/a" : `$${Math.round(n).toLocaleString("en-US")}`;
}

/** "2 schools need power first · about $7,000 unlocks them", or null when nothing is blocked. */
export function unlockLine(r: Pick<Resource, "schools_blocked" | "unlock_need" | "unlock_cost_usd">): string | null {
  if (!r.schools_blocked) return null;
  const schools = `${r.schools_blocked} school${r.schools_blocked === 1 ? "" : "s"}`;
  const first = r.unlock_need ? label("need", r.unlock_need).toLowerCase() : "something else";
  const one = r.schools_blocked === 1;
  return `${schools} ${one ? "needs" : "need"} ${first} first · about ${usd(r.unlock_cost_usd)} unlocks ${one ? "it" : "them"}`;
}

/** Percent with no decimals, e.g. 0.817 -> "82%". */
export function pct(rate: number | null | undefined): string {
  return rate == null ? "n/a" : `${Math.round(rate * 100)}%`;
}

/** Weekly attendance rows -> one series per school, ordered by week. */
export function attendanceSeries(rows: Attendance[]): { schoolId: string; schoolName: string; points: { week: string; rate: number }[] }[] {
  const bySchool = new Map<string, { schoolId: string; schoolName: string; points: { week: string; rate: number }[] }>();
  for (const r of rows) {
    const s = bySchool.get(r.school_id) ?? { schoolId: r.school_id, schoolName: r.school_name, points: [] };
    s.points.push({ week: r.week_start, rate: r.attendance_rate });
    bySchool.set(r.school_id, s);
  }
  for (const s of bySchool.values()) s.points.sort((a, b) => a.week.localeCompare(b.week));
  return [...bySchool.values()].sort((a, b) => a.schoolName.localeCompare(b.schoolName));
}

/** Short relative time like "3 min ago", "2 days ago". */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = parseDisplayDate(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

export const REFRESH_MS = 10_000;

/** The public WhatsApp-style chat where schools report. Laptops get the phone view with a QR code. */
export const CHAT_URL = "https://fnoorx.github.io/pont/chat/";

export async function fetchView<T>(view: string): Promise<T[]> {
  const { data, error } = await db().from(view).select("*");
  if (error) throw new Error(`${view}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function setVerified(assessmentId: string, verified: boolean): Promise<void> {
  const { error } = await db().rpc("set_assessment_verified", { assessment_id: assessmentId, verified });
  if (error) throw new Error(error.message);
}

/** Staff confirm a done milestone. When every milestone is confirmed, the project completes and its partner becomes proven. */
export async function setMilestoneVerified(milestoneId: string, verified: boolean): Promise<void> {
  const { error } = await db().rpc("set_milestone_verified", { milestone_id: milestoneId, verified });
  if (error) throw new Error(error.message);
}

/** Signed URLs for private field-media paths (valid for an hour). */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await db().storage.from("field-media").createSignedUrls(unique, 3600);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const s of data ?? []) if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
  return out;
}
