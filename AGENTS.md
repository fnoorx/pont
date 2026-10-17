# AGENTS.md

Guidance for AI coding agents and humans working in this repo. Read this fully before writing code.

## 0. Prototype mode (read first)

This is a **hackathon prototype**, not production software. The goal is a working demo that shows judges how the idea solves PS43's problem, using mock data.

### Priorities, in order
1. **It works live in the demo.** A judge texts the bot, and their school shows up on the dashboard.
2. **It tells the story clearly.** The judging-relevant ideas must be visible:
   - WhatsApp-first
   - bilingual
   - works on basic phones
   - privacy-aware for conflict regions
3. **It's simple enough to build in a weekend.**

### Do
- Choose the simplest thing that works.
- Hardcode where it saves time (config values, demo data, copy).
- Use mock and seed data freely. Fake data that looks realistic is better than real integrations.
- Keep the design ideas from sections 4 and 5. They are pitch points, not just engineering rules.
- Write a few tests for the conversation engine's main paths so the demo doesn't break. That's enough.

### Don't
- Don't spend time on production hardening:
  - deduplication
  - idempotency
  - retries
  - rate limiting
  - message audit logs
  - data retention jobs
  - CI pipelines
  - exhaustive test coverage
  - edge-case error handling beyond "don't crash the demo"
- Don't build features judges won't see.
- Don't over-engineer abstractions. One working path beats a flexible framework.

If something production-grade would matter in real life, mention it in the README's "What a real pilot would add" section instead of building it. That list helps the pitch.

## 1. Project overview

**Product:** Pont (French for "bridge").
**Event:** Hackathon, Team #30, "Building Bridges to Education".
**Sponsor:** PS43 Foundation (nonprofit founded by Pascal Siakam). It is based in Toronto and is expanding its education work into Cameroon.

**Challenge:** Help PS43 identify educational needs, connect resources and trusted local partners, and deploy educational infrastructure across communities in Cameroon, using appropriate technology.

**Our product pipeline:** Report → Assess → Match → Deliver → Prove

| Component | What it does | Status |
|---|---|---|
| **A. Field intake + dashboard** | WhatsApp bot (SMS fallback) collects school needs; PS43 dashboard shows map, ranked needs | **Built** |
| B. Readiness score + recommender | Scores schools, recommends Tier 0/1/2 intervention | **Prototype:** live rules-based view (`dashboard_readiness`) |
| C. Trusted partner network | Referral-based partner profiles, trust earned via delivery | **Prototype:** mock partners + live matching view |
| D. Milestones + impact | Photo-verified milestones, weekly attendance by SMS | **Prototype:** mock projects, milestones, attendance |

A is real end to end. B, C and D appear on the dashboard using mock data and simple rules (section 7), so the whole Report → Assess → Match → Deliver → Prove story can be demoed.

## 2. Repos and ownership

There are two codebases. Supabase is the contract between them.

| Repo | Built with | Owns |
|---|---|---|
| `ps43-pont` (this repo) | TypeScript, Supabase CLI | Database schema, views, seed data, conversation engine, Twilio webhook, CLI simulator |
| `ps43-pont-dashboard` | Lovable (React + Supabase) | Staff dashboard UI only |

Rules:
- **Schema:** This repo owns the database schema. The dashboard does not create or alter tables or views.
- **Access:** The dashboard reads from the `dashboard_*` views (section 7) and may call `set_assessment_verified`.
- **Changing the contract:** If you change a view column or value set, update section 7 and `docs/DASHBOARD_CONTRACT.md`, and tell your teammate.

## 3. Why WhatsApp

PS43's executive director stated that WhatsApp is how they communicate and coordinate today. Field users shouldn't need to download an app, create an account, or open a web page. WhatsApp messages queue on the phone and send when signal returns, which gives offline-tolerant behaviour for free. This is the core of the pitch.

## 4. Users and channels

| User | Channel | Notes |
|---|---|---|
| Local partner / coordinator | WhatsApp | Smartphone, patchy data. Primary reporter. |
| Headteacher / teacher | WhatsApp or SMS | May only have a basic phone. |
| Community member | WhatsApp or SMS | Optional reporter; submissions unverified by default. |
| PS43 staff (Toronto) | Web dashboard (Lovable) | Small, non-technical team. |

## 5. Design principles (keep these, they're what judges evaluate)

### Low bandwidth, low literacy friendly
- Bot messages are short (aim under 300 characters).
- Questions are numbered multiple choice. Users reply with a number. Accept simple words like "yes" or "oui" where easy.
- Optional steps (photo, location, notes) can be skipped.
- The SMS path is plain text only and skips photo and location steps.

### Bilingual
- Every bot message exists in English and French.
- Language is chosen at the first message. French is the default fallback.

### Simple conversation controls
- `RESTART` / `RECOMMENCER` starts over at any point.
- Invalid input re-asks the question with a short hint.
- Session state is stored in the database so the serverless webhook can pick up where it left off.

Nice to have only if quick:
- `HELP` / `AIDE`
- `BACK` / `RETOUR`
- Resume-after-gap

### Privacy and safety (visible in the demo)
Parts of Cameroon are conflict-affected (Northwest, Southwest, Far North), and schools there have been attacked. Showing that we thought about this is a strong pitch point.

- **Consent:** A one-message consent step before collecting data.
- **No student data:** No student names or photos of children. Photo prompts ask for the building.
- **Location:**
  - The dashboard shows rounded coordinates (1 decimal, about 11 km).
  - Schools in sensitive regions show no pin, only region-level counts.
- **Phone numbers:** The dashboard shows reporter role + last 4 digits only.
- **Access:**
  - The dashboard requires a login.
  - The service role key stays out of the dashboard and out of git.

The real implementation of these can be simple (e.g. a plain SHA-256 phone hash). The point is that the behaviour is visible.

### Low cost
Use managed free tiers (Supabase, Twilio sandbox, Lovable). No custom servers. No blockchain. No ML. Readiness logic (if built) is simple rules.

## 6. Tech stack (this repo)

- **Language:** TypeScript.
- **Backend:** Supabase.
  - Postgres for data, Auth for dashboard login, Storage for photos.
  - The Twilio webhook runs as a Supabase Edge Function.
- **Conversation engine:** plain TypeScript in `src/engine`, with no Node-only or Deno-only APIs, so the same code runs in tests, the CLI simulator, and the Edge Function.
- **Messaging:** Twilio WhatsApp Sandbox; SMS uses the same webhook.
- **Tooling:** Vitest for the handful of engine tests, `tsx` for scripts.

Photos (if time allows): download the media from Twilio in the webhook and upload it to the `field-media` bucket. If this is fiddly, skip live photo upload and use seeded photos for the demo.

Twilio signature verification is optional. Add it only if it's quick.

## 7. Database contract

The dashboard is built against this section. Keep names stable.

### Value sets (text columns, CHECK constraints are fine but optional)

| Field | Values |
|---|---|
| `building_condition` | `good`, `needs_repair`, `unsafe` |
| `power_source` | `grid_reliable`, `grid_unreliable`, `solar`, `generator`, `none` |
| `connectivity` | `good`, `weak`, `none` |
| `devices` | `none`, `few`, `enough` |
| `top_need` | `building`, `furniture`, `supplies`, `power`, `computers`, `internet`, `training`, `other` |
| `enrollment_band` | `lt100`, `100_300`, `300_600`, `gt600` |
| `role` | `headteacher`, `teacher`, `partner`, `community` |
| `language` | `en`, `fr` |
| `channel` | `whatsapp`, `sms` |
| `media type` | `photo`, `audio` |
| `tier` (B) | `tier0`, `tier1`, `tier2` |
| `partner type` (C) | `ngo`, `community_org`, `contractor`, `supplier` |
| `trust_level` (C) | `new`, `referred`, `proven` |
| `project status` (D) | `planned`, `in_progress`, `completed` |
| `milestone status` (D) | `pending`, `done` |

### Tables

- **`regions`**
  - `code` (PK)
  - `name_en`
  - `name_fr`
  - `centroid_lat`
  - `centroid_lng`
  - `is_sensitive`
- **`reporters`**
  - `id`
  - `phone_e164`
  - `phone_hash`
  - `phone_last4`
  - `channel`
  - `language`
  - `role`
  - `consent_at`
  - `created_at`
- **`sessions`**
  - `id`
  - `reporter_id`
  - `step`
  - `answers` (jsonb)
  - `status`
  - `updated_at`
- **`schools`**
  - `id`
  - `name`
  - `region_code`
  - `town`
  - `lat_exact`
  - `lng_exact`
  - `created_at`
- **`assessments`**
  - `id`
  - `ref_code`
  - `school_id`
  - `reporter_id`
  - `enrollment_band`
  - `building_condition`
  - `power_source`
  - `connectivity`
  - `devices`
  - `top_need`
  - `notes`
  - `verified` (default false)
  - `submitted_at`
- **`media`**
  - `id`
  - `assessment_id`
  - `type`
  - `storage_path`
  - `created_at`

If `processed_messages` or `messages` tables already exist from earlier work, leave them. They are not required.

A new bot submission can simply create a new school row. Don't worry about matching or deduplicating schools for the prototype.

The webhook saves a finished report with the internal RPC `submit_assessment(p_reporter_id, p_submission)` (service role only, not part of the dashboard contract). It writes the school, assessment and media in one transaction, applies the skipped-pin centroid fallback (section 8, step 14), and returns the `ref_code`.

**Prototype mock tables (B, C, D).** Filled with fictional data by `npm run seed`:
- **`partners`**: `id`, `name`, `type`, `region_code` (NULL = nationwide), `town`, `services` (text[] of `top_need` values), `trust_level`, `projects_completed`, `referred_by` (partner id), `joined_at`
- **`projects`**: `id`, `school_id`, `partner_id`, `title`, `intervention` (a `top_need` value), `tier`, `status`, `budget_usd`, `started_at`, `completed_at`, `created_at`
- **`milestones`**: `id`, `project_id`, `sort_order`, `title`, `status`, `due_date`, `completed_at`, `photo_path` (in `field-media`), `verified`
- **`attendance_reports`**: `id`, `school_id`, `week_start`, `students_present`, `students_enrolled`, `created_at` (aggregate counts only)

Readiness (B) has no table: it is computed live from each school's latest assessment by `dashboard_readiness`.

### Region seed data
Regional capitals are used as centroids.

| code | name_en | name_fr | lat | lng | sensitive |
|---|---|---|---|---|---|
| AD | Adamawa | Adamaoua | 7.32 | 13.58 | no |
| CE | Centre | Centre | 3.87 | 11.52 | no |
| ES | East | Est | 4.58 | 13.68 | no |
| EN | Far North | Extrême-Nord | 10.59 | 14.32 | yes |
| LT | Littoral | Littoral | 4.05 | 9.70 | no |
| NO | North | Nord | 9.30 | 13.40 | no |
| NW | Northwest | Nord-Ouest | 5.96 | 10.15 | yes |
| SU | South | Sud | 2.90 | 11.15 | no |
| SW | Southwest | Sud-Ouest | 4.16 | 9.24 | yes |
| OU | West | Ouest | 5.48 | 10.42 | no |

### Dashboard views (SELECT for `authenticated`)

Views run with owner privileges so they can read the raw tables. The Supabase linter warning about this is expected. Raw tables are not readable by `anon` or `authenticated`.

**`dashboard_schools`** (one row per school, latest assessment flattened)
- `id`
- `name`
- `region_code`
- `region_name`
- `town`
- `is_sensitive`
- `lat_display`, `lng_display` (rounded to 1 decimal, NULL when sensitive)
- `assessment_count`
- `last_submitted_at`
- `latest_assessment_id`
- `enrollment_band`
- `building_condition`
- `power_source`
- `connectivity`
- `devices`
- `top_need`
- `verified`

**`dashboard_assessments`** (one row per assessment)
- `id`
- `ref_code`
- `school_id`
- `school_name`
- `region_code`
- `region_name`
- `is_sensitive`
- `reporter_role`
- `reporter_last4`
- `language`
- `enrollment_band`
- `building_condition`
- `power_source`
- `connectivity`
- `devices`
- `top_need`
- `notes`
- `verified`
- `submitted_at`

**`dashboard_region_stats`** (one row per region, including regions with zero schools)
- `region_code`
- `region_name`
- `centroid_lat`
- `centroid_lng`
- `is_sensitive`
- `school_count`
- `unsafe_count`
- `no_power_count`
- `top_need`
- `last_submitted_at`

**`dashboard_media`**
- `id`
- `assessment_id`
- `school_id`
- `type`
- `storage_path`
- `created_at`

**Prototype pipeline views (B, C, D).** Same access rules as above.

**`dashboard_readiness`** (B, one row per assessed school, live rules)
- `school_id`, `school_name`, `region_code`, `region_name`, `is_sensitive`, `latest_assessment_id`
- `building_points` (good 30, needs_repair 15, unsafe 0)
- `power_points` (grid_reliable 30, solar 25, generator 15, grid_unreliable 10, none 0)
- `connectivity_points` (good 20, weak 10, none 0)
- `devices_points` (enough 20, few 10, none 0)
- `score` (0 to 100)
- `tier`: `tier0` if the building is unsafe or score < 40, `tier1` if score < 70, else `tier2`
- `safety_first` (true when an unsafe building forced `tier0`)

**`dashboard_partners`** (C)
- `id`, `name`, `type`, `region_code`, `region_name`, `town`, `services`, `trust_level`, `projects_completed`, `referred_by_id`, `referred_by_name`, `joined_at`

**`dashboard_partner_matches`** (C, up to 3 per school, live)
- `school_id`, `partner_id`, `partner_name`, `partner_type`, `trust_level`, `projects_completed`, `same_region`, `need`, `match_rank`
- Rule: partners offering the school's latest `top_need`, same region first, then nationwide, ranked by trust then delivery record.

**`dashboard_projects`** (D)
- `id`, `school_id`, `school_name`, `region_code`, `region_name`, `is_sensitive`, `partner_id`, `partner_name`, `title`, `intervention`, `tier`, `status`, `budget_usd`, `started_at`, `completed_at`, `milestones_total`, `milestones_done`

**`dashboard_milestones`** (D)
- `id`, `project_id`, `school_id`, `sort_order`, `title`, `status`, `due_date`, `completed_at`, `photo_path`, `verified`

**`dashboard_attendance`** (D, one row per school per week)
- `school_id`, `school_name`, `region_code`, `week_start`, `students_present`, `students_enrolled`, `attendance_rate`

**`dashboard_impact_summary`** (D, exactly one row of headline numbers)
- `school_count`, `assessment_count`, `verified_count`, `partner_count`, `proven_partner_count`, `projects_planned`, `projects_in_progress`, `projects_completed`, `students_reached`, `attendance_before`, `attendance_after`

### RPC
- `set_assessment_verified(assessment_id uuid, verified boolean) returns void`
- Callable by `authenticated`.

### Storage
- Private bucket `field-media`.
- `authenticated` can read (for signed URLs).

## 8. The school assessment flow

1. **Language:** 1 English / 2 Français
2. **Consent:** 1 Agree / 2 No
3. **Role:** headteacher, teacher, local partner, community member
4. **School name:** free text
5. **Region:** numbered list of the 10 regions
6. **Town or village:** free text
7. **Enrollment:** under 100 / 100-300 / 300-600 / over 600
8. **Building condition:** good / needs repairs / unsafe or no roof
9. **Electricity:** reliable grid / unreliable grid / solar / generator / none
10. **Mobile signal / internet:** good / weak / none
11. **Devices for students:** none / a few / enough
12. **Biggest need:**
    - building repairs
    - desks and furniture
    - books and supplies
    - power
    - computers
    - internet
    - teacher training
    - other
13. **Photo of the building:** optional, WhatsApp only
14. **Location pin:** optional, WhatsApp only. If skipped, use the region centroid plus a small random offset so the school still appears on the map.
15. **Anything else:** optional free text
16. **Summary + confirm:** 1 Submit / 2 Start over

After submit, reply with a short thank-you and the `ref_code`.

**Demo target:** completable in under 3 minutes.

## 9. Architecture (keep it light)

- **The engine is a function:** `(session, inboundMessage) => { nextSession, replies }`. Keeping it free of I/O makes it easy to test and to run in the CLI simulator.
- **The flow is a config array of steps** (prompt per language, options, next step). Don't build a generic workflow framework.
- **The webhook does the basics:** load the session, run the engine, save, reply via TwiML.

## 10. Seed and demo data

- About 20 fictional schools across at least 6 regions, including some in NW, SW and EN so the privacy behaviour is visible.
- English and French names and notes matching the region. Names must be clearly fictional.
- Realistic spread:
  - Unsafe buildings with no power.
  - Solar schools wanting computers.
  - Good infrastructure wanting teacher training.
- Some schools with 2 to 3 assessments.
- Mix of verified and unverified.
- A few seeded placeholder building photos are welcome.
- The seed also creates a demo staff user from `DEMO_STAFF_EMAIL` and `DEMO_STAFF_PASSWORD`, with email confirmed.
- `npm run seed` clears app data (not regions) and reseeds.

## 11. Commands

The project should expose these npm scripts:

- `npm run test`: engine tests
- `npm run seed`: reset and seed demo data
- `npm run simulate`: terminal chat with the engine, no Twilio needed
- `npm run db:push`: apply migrations to the linked project
- `npm run functions:deploy`: deploy the webhook

Lint and typecheck scripts are nice to have, not blockers.

## 12. Done means

- **The demo path works end to end:**
  - Seeded dashboard data shows up.
  - A WhatsApp submission appears on the dashboard.
- **Bot copy:** Both languages work.
- **Privacy:** Sensitive regions show no school pins.
- **Secrets:** None committed.

## 13. Writing style

- Plain, warm, respectful. Short sentences.
- No em dashes in any written output (copy, docs, comments). Use commas, colons, or parentheses.
- Bot copy should sound like a helpful coordinator, not a form.

## 14. Out of scope

- Production hardening (see section 0).
- Real WhatsApp Business API onboarding.
- Payments or mobile money.
- IVR or voice flows.
- Dashboard UI code in this repo.

B, C and D are mock data and simple rules only. No real partner onboarding, project workflows, or attendance collection by SMS.