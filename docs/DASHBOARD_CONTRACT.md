# Pont dashboard contract

This is the handoff for whoever builds the PS43 staff dashboard in Lovable (`ps43-pont-dashboard`).
The database lives in the `ps43-pont` repo. This document is the agreement between the two.

**The short version:**

- Read only from the `dashboard_*` views: the 4 core views (section 2) and the 8 pipeline views (section 9). Nothing else.
- The writes are the `set_assessment_verified` and `set_milestone_verified` RPCs.
- Never create, alter or drop tables, views, policies or functions from the dashboard. If Lovable offers to run a SQL migration, decline it and ask in the team chat instead.
- Users must be signed in. Signed-out (anon) requests get a permission error on everything.

If something here is wrong or missing, tell Faizan rather than working around it. Changes to this contract happen in the `ps43-pont` repo and are mirrored here.

---

## 1. Connecting

| What | Where to get it |
|---|---|
| Supabase URL | Supabase dashboard > Project Settings > API > Project URL (project ref `pfniphvzvgmmghejwadl`) |
| Anon (public) key | Same page, the `anon` / publishable key. Safe to put in frontend code. |
| Demo staff login | Ask Faizan for the email and password. Do not commit them. |

**Never use the service role key in the dashboard.** If anyone pastes it into Lovable, rotate it.

### Option A (recommended): plain client with the anon key

Create a Supabase client in the app with the URL and anon key. This is all the dashboard needs, and it keeps Lovable from trying to manage the schema.

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Option B: Lovable's built-in Supabase integration

This works too, but Lovable will then be able to propose database migrations. **Reject every migration it suggests.** The schema is owned by the other repo, and an accidental migration can break the WhatsApp bot.

### Sign in

Use email + password auth: `supabase.auth.signInWithPassword({ email, password })`.
Public sign-up is disabled, so there is no sign-up page. New staff accounts are created by Faizan.

---

## 2. Views

All views are read only. Types are shown as they arrive in JavaScript.
`uuid` and `timestamptz` come back as strings (timestamps are ISO 8601, UTC).
Nullable columns are marked with `?`.

### `dashboard_schools`

One row per school, with its **latest** assessment flattened in. Use this for the map and the ranked needs list.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | School id |
| `name` | string | |
| `region_code` | string | e.g. `NW`. See region list below |
| `region_name` | string | English region name |
| `town` | string? | Town or village |
| `is_sensitive` | boolean | School is in a conflict-affected region |
| `lat_display` | number? | Rounded to 1 decimal (about 11 km). **NULL when sensitive.** If the reporter skipped the pin, the school is placed near its regional capital automatically |
| `lng_display` | number? | Same as above |
| `assessment_count` | number | How many reports this school has (0 or more) |
| `last_submitted_at` | timestamp? | Most recent report |
| `latest_assessment_id` | uuid? | Links to `dashboard_assessments.id` |
| `enrollment_band` | string? | Latest report. Value set below |
| `building_condition` | string? | Latest report |
| `power_source` | string? | Latest report |
| `connectivity` | string? | Latest report |
| `devices` | string? | Latest report |
| `top_need` | string? | Latest report |
| `verified` | boolean? | Whether the latest report is verified |

The `?` on assessment fields is only for a school with zero reports, which should not happen in practice.

### `dashboard_assessments`

One row per report. A school can have many; they are never overwritten. Use this for a school's history and for the verify toggle.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Assessment id (pass this to the RPC) |
| `ref_code` | string | Short code like `PS-4F2K`, the same one the reporter received |
| `school_id` | uuid | Links to `dashboard_schools.id` |
| `school_name` | string | |
| `region_code` | string | |
| `region_name` | string | |
| `is_sensitive` | boolean | |
| `reporter_role` | string? | Value set below |
| `reporter_last4` | string? | Last 4 digits of the reporter's phone, for spotting repeat reporters. NULL for web chat reports (no phone) |
| `language` | string? | Language the reporter used (`en` / `fr`) |
| `enrollment_band` | string | |
| `building_condition` | string | |
| `power_source` | string | |
| `connectivity` | string | |
| `devices` | string | |
| `top_need` | string | |
| `notes` | string? | Free text from the reporter, may be French or English |
| `verified` | boolean | Defaults to false. Staff set it with the RPC |
| `submitted_at` | timestamp | |
| `reporter_channel` | string? | How it was reported: `whatsapp` WhatsApp, `sms` SMS, `web` Web chat (demo). Added later, at the end |

### `dashboard_region_stats`

One row per region, **always all 10 regions** (including ones with zero schools). Use this for region summaries and for showing sensitive regions on the map as a single marker.

| Column | Type | Notes |
|---|---|---|
| `region_code` | string | |
| `region_name` | string | English |
| `centroid_lat` | number | Regional capital. Safe to show, even for sensitive regions |
| `centroid_lng` | number | |
| `is_sensitive` | boolean | |
| `school_count` | number | |
| `unsafe_count` | number | Schools whose latest report says `unsafe` |
| `no_power_count` | number | Schools whose latest report says power `none` |
| `top_need` | string? | Most common latest need in the region. NULL if no schools |
| `last_submitted_at` | timestamp? | NULL if no schools |

### `dashboard_media`

Photos and voice notes attached to reports.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `assessment_id` | uuid | Links to `dashboard_assessments.id` |
| `school_id` | uuid | Links to `dashboard_schools.id` |
| `type` | string | `photo` or `audio` |
| `storage_path` | string | Path inside the `field-media` bucket. Not a URL (see section 5) |
| `created_at` | timestamp | |

The demo data has 4 placeholder building drawings so you can build and test the photo viewer.

---

## 3. Value sets

Columns store the code on the left. Show the label to users.

**`enrollment_band`** (number of students)

| Code | English | Français |
|---|---|---|
| `lt100` | Under 100 | Moins de 100 |
| `100_300` | 100 to 300 | 100 à 300 |
| `300_600` | 300 to 600 | 300 à 600 |
| `gt600` | Over 600 | Plus de 600 |

**`building_condition`**

| Code | English | Français |
|---|---|---|
| `good` | Good | Bon état |
| `needs_repair` | Needs repairs | À réparer |
| `unsafe` | Unsafe or no roof | Dangereux ou sans toit |

**`power_source`**

| Code | English | Français |
|---|---|---|
| `grid_reliable` | Reliable grid | Réseau fiable |
| `grid_unreliable` | Unreliable grid | Réseau instable |
| `solar` | Solar | Solaire |
| `generator` | Generator | Groupe électrogène |
| `none` | No electricity | Pas d'électricité |

**`connectivity`** (mobile signal / internet)

| Code | English | Français |
|---|---|---|
| `good` | Good | Bon |
| `weak` | Weak | Faible |
| `none` | None | Aucun |

**`devices`** (for students)

| Code | English | Français |
|---|---|---|
| `none` | None | Aucun |
| `few` | A few | Quelques-uns |
| `enough` | Enough | Suffisamment |

**`top_need`**

| Code | English | Français |
|---|---|---|
| `building` | Building repairs | Réparation du bâtiment |
| `furniture` | Desks and furniture | Tables-bancs et mobilier |
| `supplies` | Books and supplies | Livres et fournitures |
| `power` | Power | Électricité |
| `computers` | Computers | Ordinateurs |
| `internet` | Internet | Internet |
| `training` | Teacher training | Formation des enseignants |
| `other` | Other | Autre |

**`reporter_role`**

| Code | English | Français |
|---|---|---|
| `headteacher` | Headteacher | Directeur / Directrice |
| `teacher` | Teacher | Enseignant(e) |
| `partner` | Local partner | Partenaire local |
| `community` | Community member | Membre de la communauté |

**`language`**: `en` English, `fr` Français.
**`type`** (media): `photo`, `audio`.

**Regions**

| Code | English | Sensitive |
|---|---|---|
| `AD` | Adamawa | |
| `CE` | Centre | |
| `ES` | East | |
| `EN` | Far North | yes |
| `LT` | Littoral | |
| `NO` | North | |
| `NW` | Northwest | yes |
| `SU` | South | |
| `SW` | Southwest | yes |
| `OU` | West | |

---

## 4. The one write: `set_assessment_verified`

Marks a report as verified (or unverified) after staff have checked it.

```ts
const { error } = await supabase.rpc("set_assessment_verified", {
  assessment_id: "<dashboard_assessments.id>",
  verified: true, // or false to undo
});
```

- Returns nothing on success.
- Errors if the id does not exist, or if the user is not signed in.
- After calling it, re-fetch the affected rows. `dashboard_schools.verified` reflects the school's latest report only.

### Second write: `set_milestone_verified`

Staff confirm a milestone that is `done` (often one a partner reported from the chat with `DONE PJ-104` and a photo).

```ts
const { error } = await supabase.rpc("set_milestone_verified", {
  milestone_id: "<dashboard_milestones.id>",
  verified: true,
});
```

- Errors if the milestone does not exist or is not `done`.
- When every milestone of the project is done and verified, the project becomes `completed` and its partner gains one delivered project and becomes `proven`. Re-fetch projects, milestones and partners afterwards.
- New columns, appended at the end of their views: `dashboard_projects.code` (e.g. `PJ-104`, what partners send from the chat) and `dashboard_milestones.reported_via_chat` (true when a partner reported it from the chat).

---

## 5. Photos and voice notes (storage)

Files are in a **private** bucket called `field-media`. There are no public URLs. To show a file, create a short-lived signed URL:

```ts
const { data, error } = await supabase.storage
  .from("field-media")
  .createSignedUrl(media.storage_path, 60 * 10); // valid for 10 minutes

// <img src={data.signedUrl} />  or  <audio src={data.signedUrl} controls />
```

- Signed-in staff can read. Nobody can upload, replace or delete from the dashboard (only the bot can).
- Do not save signed URLs anywhere. Create them when needed.

---

## 6. Privacy rules the UI must respect

Parts of Cameroon are conflict-affected, and schools there have been attacked. The database already does most of the work, but please keep these in mind:

1. **Sensitive schools never get a pin.** When `is_sensitive` is true, `lat_display` / `lng_display` are NULL. Show these schools only as part of the region marker (from `dashboard_region_stats`), not as individual points. Do not try to place them using the town name or any other workaround.
2. **Approximate pins.** If a reporter skipped the location step, the database places the school near its regional capital with a random offset of about 15 km. It is fine to label all pins "approximate location". Do not geocode the town name.
3. **Rounded coordinates are approximate.** About 11 km. Do not label them as exact or zoom the map in further than makes sense for that precision.
4. **No student data exists, and none should be added.** Do not add fields or uploads for student names, ages or photos of children.
5. **Phone numbers.** Only `reporter_last4` is available. Do not ask for or display full numbers.
6. **Exports.** If you add CSV export, export only what is already in the views.

---

## 7. Live updates

Supabase Realtime does not work on views. To show new reports "live" (for example, during the demo when a judge submits from their phone), **poll** `dashboard_schools` and `dashboard_assessments` every 5 to 10 seconds while the page is open. The data is small, so this is cheap.

---

## 8. Demo data

The database is seeded with 5 **fictional** schools in 5 regions (Centre, Littoral, West, Southwest, South), 10 reports, a mix of verified and unverified, and notes in English and French. Three are Tier 2 and two are Tier 1; none is unsafe, because the presenter adds a Tier 0 school live from the chat during the pitch. Palm Grove (Southwest) is the one sensitive-region school, so it has no pin. Regions with no school still appear in `dashboard_region_stats` with zero counts. It also has fictional partners, projects, milestones and weekly attendance for the pipeline screens (section 9). Seed data can be wiped and reloaded at any time with `npm run seed` in the `ps43-pont` repo, so do not rely on specific ids.

Real reports from the WhatsApp bot will appear alongside the demo data once the bot is live.

---

## 9. Pipeline views: Assess, Match, Deliver, Prove (prototype)

These views let the dashboard tell the whole story: **Report → Assess → Match → Deliver → Prove**.
Same rules as above: read only, signed-in users only.

- **Assess (readiness)** is **live**. It is calculated from each school's latest report with simple rules, so a school a judge submits gets a score and tier straight away.
- **Match** is **live** too, but the partners it matches against are fictional.
- **Deliver and Prove** (projects, milestones, attendance) are **mock data**. Consider a small "Demo data" label on those screens.

### `dashboard_readiness` (one row per school with a report)

| Column | Type | Notes |
|---|---|---|
| `school_id` | uuid | Links to `dashboard_schools.id` |
| `school_name` | string | |
| `region_code`, `region_name` | string | |
| `is_sensitive` | boolean | |
| `latest_assessment_id` | uuid | The report the score is based on |
| `building_points` | number | Good 30, needs repairs 15, unsafe 0 |
| `power_points` | number | Reliable grid 30, solar 25, generator 15, unreliable grid 10, none 0 |
| `connectivity_points` | number | Good 20, weak 10, none 0 |
| `devices_points` | number | Enough 20, a few 10, none 0 |
| `score` | number | 0 to 100, the sum of the four |
| `tier` | string | See tiers below |
| `safety_first` | boolean | True when an unsafe building forced Tier 0 regardless of score |
| `tier_capped` | boolean | True when weak power (none or unreliable grid) lowered Tier 2 to Tier 1 |
| `stated_need` | string | What the school said it needs most (latest `top_need`) |
| `blocked_by` | string? | First missing prerequisite: `building`, `power`, `devices` (no computers), `signal` (no mobile signal). NULL if nothing blocks the stated need |
| `recommended_need` | string | What to fund first (a `top_need` value) |
| `package` | string[] | Everything to fund, in order, to really meet the stated need. Example: `["power", "computers"]` |

**Tiers** (show the name and the one-line recommendation):

| Code | Name | Rule | Recommendation |
|---|---|---|---|
| `tier0` | Tier 0: Foundations | Unsafe building, or score under 40 | Safe classrooms first: repairs, desks, books and supplies. Learning materials that need no power. |
| `tier1` | Tier 1: Offline digital | Score 40 to 69 | Solar power and an offline content server with shared tablets. No internet needed. |
| `tier2` | Tier 2: Connected | Score 70 or more, and reliable power | Computer lab, internet and teacher training. |

**Dependency rules.** Infrastructure is a chain: safe building → power → devices → internet. A school asking for computers with no electricity gets `blocked_by = power`, `recommended_need = power` and `package = ["power", "computers"]`. A school without reliable power is never Tier 2 (`tier_capped` shows when this happened).

| Stated need | Needs first |
|---|---|
| Furniture | A safe building |
| Power (solar) | A safe building (no panels on an unsafe roof) |
| Computers | A safe building, then power |
| Internet | A safe building, power, devices; no signal is flagged |
| Building, supplies, training, other | Nothing |

Good UI badge: **"Asked for computers · needs power first"** when `blocked_by` is not NULL. Use these labels: `building` "a safe building", `power` "power", `devices` "devices", `signal` "mobile signal (or satellite)".

Showing the four point columns next to the score makes the "transparent rules, not AI" point visible.

### `dashboard_partners`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | Fictional |
| `type` | string | `ngo` NGO, `community_org` Community group, `contractor` Contractor, `supplier` Supplier |
| `region_code`, `region_name` | string? | NULL means the partner works nationwide |
| `town` | string? | |
| `services` | string[] | Values from `top_need` (see section 3 labels) |
| `trust_level` | string | `new` New, `referred` Referred, `proven` Proven |
| `projects_completed` | number | |
| `referred_by_id`, `referred_by_name` | uuid?, string? | The partner who vouched for them. Good for a "trust network" view |
| `joined_at` | timestamp | |

Trust story for the UI: partners join through a **referral** from a trusted partner, and become **proven** by delivering projects.

### `dashboard_partner_matches` (up to 3 per school)

| Column | Type | Notes |
|---|---|---|
| `school_id` | uuid | |
| `partner_id`, `partner_name`, `partner_type` | | |
| `trust_level`, `projects_completed` | | |
| `same_region` | boolean | False means a nationwide partner |
| `need` | string | The school's `recommended_need` (what to fund first) |
| `match_rank` | number | 1 is the best match |
| `covers` | string[] | Which items of the school's `package` this partner can deliver |
| `covers_full_package` | boolean | True if this partner can deliver the whole package. Worth a badge |

Rule: partners who offer the school's recommended need, ranked by how much of the package they cover, then same region, then trust, then delivery record. Schools whose need is `other` have no matches.

### `dashboard_priority` (who should PS43 help first)

| Column | Type | Notes |
|---|---|---|
| `school_id`, `school_name`, `region_code`, `region_name`, `is_sensitive` | | |
| `readiness_score`, `tier` | number, string | From `dashboard_readiness` |
| `stated_need`, `recommended_need`, `blocked_by` | | From `dashboard_readiness` |
| `enrollment_band`, `verified` | | From the latest report |
| `need_points` | number | 100 minus the readiness score |
| `safety_points` | number | 20 if the building is unsafe |
| `size_points` | number | Students: under 100 = 0, 100 to 300 = 10, 300 to 600 = 20, over 600 = 30 |
| `verified_points` | number | 10 if PS43 verified the latest report |
| `priority` | number | Sum of the four (0 to 160). Higher = help sooner |
| `priority_rank` | number | 1 = help first. Sort by this for the ranked needs list |

Show the four parts next to the total (for example as a stacked bar) so staff and judges can see why a school ranks where it does.

### `dashboard_projects`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `school_id`, `school_name`, `region_code`, `region_name`, `is_sensitive` | | |
| `partner_id`, `partner_name` | uuid?, string? | |
| `title` | string | e.g. "Roof repair for two classrooms" |
| `intervention` | string | A `top_need` value |
| `tier` | string | `tier0` / `tier1` / `tier2` |
| `status` | string | `planned` Planned, `in_progress` In progress, `completed` Completed |
| `budget_usd` | number? | |
| `started_at`, `completed_at` | date? | `YYYY-MM-DD` |
| `milestones_total`, `milestones_done` | number | For a progress bar |

### `dashboard_milestones`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `project_id`, `school_id` | uuid | |
| `sort_order` | number | Show in this order |
| `title` | string | |
| `status` | string | `pending` Pending, `done` Done |
| `due_date`, `completed_at` | date? | |
| `photo_path` | string? | Proof photo in the `field-media` bucket. Use a signed URL exactly as in section 5 |
| `verified` | boolean | Photo checked by PS43 staff |

### `dashboard_attendance` (one row per school per week)

| Column | Type | Notes |
|---|---|---|
| `school_id`, `school_name`, `region_code` | | |
| `week_start` | date | Monday of that week |
| `students_present` | number | Aggregate count only |
| `students_enrolled` | number | |
| `attendance_rate` | number | 0 to 1 |

Seeded attendance exists only for schools with active or finished projects. Schools can also send real weekly counts from the bot, so new schools may appear here. A line chart per school shows attendance rising after a project is completed.

### `dashboard_impact_summary` (exactly one row)

| Column | Type | Notes |
|---|---|---|
| `school_count`, `assessment_count`, `verified_count` | number | Real plus seeded reports |
| `partner_count`, `proven_partner_count` | number | |
| `projects_planned`, `projects_in_progress`, `projects_completed` | number | |
| `students_reached` | number | Students at schools with a completed project |
| `attendance_before`, `attendance_after` | number? | Average attendance rate at those schools before and after completion (0 to 1) |

Good for a headline strip, for example: "Attendance up from 64% to 82% after delivery".

### `dashboard_package_costs` (one row per school with a report)

What each school's package would cost. Costs are **rough estimates** per need, to be confirmed with partners: label them that way.

| Column | Type | Notes |
|---|---|---|
| `school_id`, `school_name`, `region_code`, `region_name`, `is_sensitive` | | As in `dashboard_readiness` |
| `tier`, `stated_need`, `recommended_need`, `package` | | As in `dashboard_readiness` |
| `first_step_cost_usd` | number | Estimated cost of `recommended_need` |
| `package_cost_usd` | number | Estimated cost of the whole package |
| `priority_rank` | number | As in `dashboard_priority` (1 = help first) |

### `dashboard_resources` (one row per resource, mock data)

Equipment, funding and expertise PS43 could deploy, and which schools can use each one.

| Column | Type | Notes |
|---|---|---|
| `id`, `name`, `provider`, `location` | string | Providers are fictional |
| `kind` | string | `equipment`, `funding`, `expertise` |
| `need` | string? | A `top_need` value. NULL = any need (unrestricted funding) |
| `quantity`, `unit` | number?, string? | e.g. 40 laptops |
| `value_usd` | number? | Value of equipment, or amount of funding |
| `schools_wanting` | number | Schools with this need anywhere in their package |
| `schools_ready` | number | Schools where this is the first thing to fund: can use it now |
| `schools_blocked` | number | Schools that need something else first |
| `unlock_need` | string? | The most common first step for the blocked schools (e.g. `power`) |
| `unlock_cost_usd` | number | Estimated cost of those first steps across the blocked schools |

Good for a line like: "70 computers available: 4 schools can use them now, 2 need power first ($7,000 of solar unlocks them)."

### Suggested screens

1. **Ranked needs:** a list sorted by `dashboard_priority.priority_rank`, with the four point parts and a "needs X first" badge.
2. **School detail:** add a readiness card (tier, score, the four point bars, "fund first" and the package) and a "Matched partners" list with a "covers everything" badge.
3. **Partners:** a table or cards with trust badges and "referred by".
4. **Projects:** a list with a status and progress bar; click through to milestones with proof photos.
5. **Impact:** the summary numbers plus an attendance chart per school.

Suggested Lovable prompt:

> "Add a 'Ranked needs' page from the `dashboard_priority` view sorted by `priority_rank`, showing priority with a stacked bar of need_points, safety_points, size_points and verified_points, and a badge 'needs {blocked_by} first' when blocked_by is set. Add pipeline screens using these Supabase views (read only, do not create tables): on the school detail panel show readiness from `dashboard_readiness` (tier name, score out of 100, and four point bars) and up to 3 matched partners from `dashboard_partner_matches` filtered by `school_id`. Add a Partners page from `dashboard_partners` with trust badges (new, referred, proven) and 'referred by'. Add a Projects page from `dashboard_projects` with status and a milestones progress bar; clicking a project lists `dashboard_milestones` by `sort_order` with proof photos from the private `field-media` bucket via signed URLs. Add an Impact page with a headline strip from `dashboard_impact_summary` and a weekly attendance line chart per school from `dashboard_attendance`. Label Projects, Partners and Impact as demo data."

