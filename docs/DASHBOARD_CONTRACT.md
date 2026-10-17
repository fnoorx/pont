# Pont dashboard contract

This is the handoff for whoever builds the PS43 staff dashboard in Lovable (`ps43-pont-dashboard`).
The database lives in the `ps43-pont` repo. This document is the agreement between the two.

**The short version:**

- Read only from the `dashboard_*` views: the 4 core views (section 2) and the 7 pipeline views (section 9). Nothing else.
- The only write is the `set_assessment_verified` RPC.
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

The database is seeded with about 20 **fictional** schools across all 10 regions, 30 reports, a mix of verified and unverified, and notes in English and French. It also has fictional partners, projects, milestones and weekly attendance for the pipeline screens (section 9). Seed data can be wiped and reloaded at any time with `npm run seed` in the `ps43-pont` repo, so do not rely on specific ids.

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

**Tiers** (show the name and the one-line recommendation):

| Code | Name | Rule | Recommendation |
|---|---|---|---|
| `tier0` | Tier 0: Foundations | Unsafe building, or score under 40 | Safe classrooms first: repairs, desks, books and supplies. Learning materials that need no power. |
| `tier1` | Tier 1: Offline digital | Score 40 to 69 | Solar power and an offline content server with shared tablets. No internet needed. |
| `tier2` | Tier 2: Connected | Score 70 or more | Computer lab, internet and teacher training. |

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
| `need` | string | The school's latest `top_need` that the partner covers |
| `match_rank` | number | 1 is the best match |

Rule: partners who offer the school's biggest need, same region first, then nationwide, ranked by trust then delivery record. Schools whose need is `other` have no matches.

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

Only schools with active or finished projects have attendance. A line chart per school shows attendance rising after a project is completed.

### `dashboard_impact_summary` (exactly one row)

| Column | Type | Notes |
|---|---|---|
| `school_count`, `assessment_count`, `verified_count` | number | Real plus seeded reports |
| `partner_count`, `proven_partner_count` | number | |
| `projects_planned`, `projects_in_progress`, `projects_completed` | number | |
| `students_reached` | number | Students at schools with a completed project |
| `attendance_before`, `attendance_after` | number? | Average attendance rate at those schools before and after completion (0 to 1) |

Good for a headline strip, for example: "Attendance up from 64% to 82% after delivery".

### Suggested screens

1. **School detail:** add a readiness card (tier, score, the four point bars) and a "Matched partners" list.
2. **Partners:** a table or cards with trust badges and "referred by".
3. **Projects:** a list with a status and progress bar; click through to milestones with proof photos.
4. **Impact:** the summary numbers plus an attendance chart per school.

Suggested Lovable prompt:

> "Add pipeline screens using these Supabase views (read only, do not create tables): on the school detail panel show readiness from `dashboard_readiness` (tier name, score out of 100, and four point bars) and up to 3 matched partners from `dashboard_partner_matches` filtered by `school_id`. Add a Partners page from `dashboard_partners` with trust badges (new, referred, proven) and 'referred by'. Add a Projects page from `dashboard_projects` with status and a milestones progress bar; clicking a project lists `dashboard_milestones` by `sort_order` with proof photos from the private `field-media` bucket via signed URLs. Add an Impact page with a headline strip from `dashboard_impact_summary` and a weekly attendance line chart per school from `dashboard_attendance`. Label Projects, Partners and Impact as demo data."

