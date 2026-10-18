# AGENTS.md

Guidance for AI coding agents and humans working in this repo. Read this fully before writing code.

## 0. Prototype mode (read first)

This is a **hackathon prototype**, not production software. The goal is a working demo that shows judges how the idea solves PS43's problem, using mock data.

### Priorities, in order
1. **It works live in the demo.** A judge (or a teammate) reports a school in the WhatsApp-style web chat, and it appears on the dashboard within seconds, scored and ranked.
2. **It tells the story clearly.** The judging-relevant ideas must be visible:
   - WhatsApp-first: PS43 already coordinates on WhatsApp, so Pont is a conversation, not an app. The demo is a web replica because WhatsApp's free test numbers can't reach judges' phones; say so plainly.
   - bilingual (English and French), and works on basic phones (the SMS path)
   - privacy-aware for conflict regions
   - **the dependency chain:** don't send laptops to a school with no power. Pont recommends what to fund first (safe building, then power, then devices, then internet). This is the strongest idea; it answers the brief's own example.
   - **resources, not just needs:** what PS43 has to give (equipment, funding, expertise), which schools can use it now, and what cheaper first step unlocks the rest
   - **trust earned by delivery:** partners join by referral and become Proven when staff confirm their milestones
   - **measured impact:** headteachers send weekly attendance from the chat, echoing PS43's roof story (attendance back above 80% after a renovation)
3. **It's simple enough to build in a weekend.**

### How it is judged
- Shortlist judging: Sunday 2026-10-18 at 12:30 PM. Judges come to the table; each team gets a **3-minute pitch**. Finals at 4 PM.
- Rubric: Problem Understanding 15, Solution Quality 20, Technical Execution & Demo 20, Innovation 15, Feasibility & Impact 15, Communication & Pitch 15.
- The submission must include a short **pilot roadmap**: how PS43 could pilot with a few schools or partners, and what to validate. Ours: 10 schools and 3 partners in Littoral and Centre over 12 weeks.
- The night before judging, keep the live demo stable: test every change end to end and run `npm run demo:reset` after testing on the live project.

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
  - retries (one deliberate exception: the web chat waits for signal and resends, because patchy signal is a pitch point. It reuses the message id, and the webhook answers a repeated id with the replies it already sent, so nothing is processed twice)
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
| D. Milestones + impact | Photo-verified milestones, weekly attendance by chat or SMS | **Prototype:** mock projects and milestones; attendance is live from the bot (plus seeded history) |

A is real end to end. B, C and D appear on the dashboard using mock data and simple rules (section 7), so the whole Report → Assess → Match → Deliver → Prove story can be demoed.

## 2. Repos and ownership

There are two codebases in this one repo. Supabase is the contract between them.

| Part | Built with | Owns |
|---|---|---|
| Root (`src`, `supabase`, `scripts`, `web`) | TypeScript, Supabase CLI | Database schema, views, seed data, conversation engine, web chat, CLI simulator |
| `dashboard/` | Lovable (React + Supabase) | Staff dashboard UI only |

`dashboard/` started as the Lovable project cameroon-compass (its history is kept here) and is now edited only in this repo. To publish it, run `npm run dashboard:build`, then commit `web/` and push.

Rules:
- **Schema:** This repo owns the database schema. The dashboard does not create or alter tables or views.
- **Access:** The dashboard reads from the `dashboard_*` views (section 7) and may call `set_assessment_verified` and `set_milestone_verified`.
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
  - The database views only answer signed-in users. The published demo dashboard signs in with the demo staff account (built in from `.env` by `npm run dashboard:build`), so judges skip the sign-in screen; a real pilot would give each staff member their own login.
  - The service role key stays out of the dashboard and out of git.

The real implementation of these can be simple (e.g. a plain SHA-256 phone hash). The point is that the behaviour is visible.

### Low cost
Use managed free tiers (Supabase, GitHub Pages, Lovable). No custom servers. No blockchain. No ML. Readiness logic (if built) is simple rules.

## 6. Tech stack (this repo)

- **Language:** TypeScript.
- **Backend:** Supabase.
  - Postgres for data, Auth for dashboard login, Storage for photos.
  - The `web-chat` endpoint runs as a Supabase Edge Function.
- **Conversation engine:** plain TypeScript in `src/engine`, with no Node-only or Deno-only APIs, so the same code runs in tests, the CLI simulator, and the Edge Function.
- **Messaging:** the WhatsApp-style web chat (section 8). The SMS path is demoed with `npm run simulate -- --sms`. The Twilio webhook was removed (the free trial blocks it); a real WhatsApp or SMS provider would be a thin adapter in front of `createInboundProcessor`.
- **Tooling:** Vitest for the handful of engine tests, `tsx` for scripts.

Photos: the web chat sends them as data URLs, and the inbound processor uploads them to the `field-media` bucket.

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
| `channel` | `whatsapp`, `sms`, `web` |
| `media type` | `photo`, `audio` |
| `tier` (B) | `tier0`, `tier1`, `tier2` |
| `partner type` (C) | `ngo`, `community_org`, `contractor`, `supplier` |
| `resource kind` (C) | `equipment`, `funding`, `expertise` |
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
- `reporter_channel` (`whatsapp`, `sms` or `web`)

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
- `tier`: `tier0` if the building is unsafe or score < 40, `tier1` if score < 70, else `tier2`. Capped at `tier1` when power is `none` or `grid_unreliable`.
- `safety_first` (true when an unsafe building forced `tier0`)
- `tier_capped` (true when weak power lowered Tier 2 to Tier 1)
- `stated_need` (the school's latest `top_need`)
- `blocked_by` (`building`, `power`, `devices`, `signal` or NULL): the first missing prerequisite for the stated need
- `recommended_need`: what to fund first (a `top_need` value)
- `package` (text[]): everything to fund, in order, to meet the stated need

Dependency rules (infrastructure is a chain: safe building → power → devices → internet): furniture and power need a safe building; computers need a safe building, then power (not `none` or `grid_unreliable`); internet needs all of that plus devices, and no mobile signal is flagged as `signal`. Building, supplies, training and other have no prerequisites.

**`dashboard_partners`** (C)
- `id`, `name`, `type`, `region_code`, `region_name`, `town`, `services`, `trust_level`, `projects_completed`, `referred_by_id`, `referred_by_name`, `joined_at`

**`dashboard_partner_matches`** (C, up to 3 per school, live)
- `school_id`, `partner_id`, `partner_name`, `partner_type`, `trust_level`, `projects_completed`, `same_region`, `need`, `match_rank`, `covers` (text[]), `covers_full_package`
- Rule: partners offering the school's `recommended_need`, ranked by how much of the `package` they cover, then same region, then trust, then delivery record. `need` is the recommended need.

**`dashboard_priority`** (B, one row per assessed school: who to help first)
- `school_id`, `school_name`, `region_code`, `region_name`, `is_sensitive`, `readiness_score`, `tier`, `stated_need`, `recommended_need`, `blocked_by`, `enrollment_band`, `verified`
- `need_points` (100 minus readiness score), `safety_points` (20 if unsafe), `size_points` (under 100: 0, 100 to 300: 10, 300 to 600: 20, over 600: 30), `verified_points` (10 if verified)
- `priority` (sum of the four), `priority_rank` (1 = help first)

**`dashboard_projects`** (D)
- `id`, `school_id`, `school_name`, `region_code`, `region_name`, `is_sensitive`, `partner_id`, `partner_name`, `title`, `intervention`, `tier`, `status`, `budget_usd`, `started_at`, `completed_at`, `milestones_total`, `milestones_done`

**`dashboard_milestones`** (D)
- `id`, `project_id`, `school_id`, `sort_order`, `title`, `status`, `due_date`, `completed_at`, `photo_path`, `verified`

**`dashboard_attendance`** (D, one row per school per week)
- `school_id`, `school_name`, `region_code`, `week_start`, `students_present`, `students_enrolled`, `attendance_rate`

**`dashboard_impact_summary`** (D, exactly one row of headline numbers)
- `school_count`, `assessment_count`, `verified_count`, `partner_count`, `proven_partner_count`, `projects_planned`, `projects_in_progress`, `projects_completed`, `students_reached`, `attendance_before`, `attendance_after`

**`dashboard_package_costs`** (C, one row per assessed school)
- `school_id`, `school_name`, `region_code`, `region_name`, `is_sensitive`, `tier`, `stated_need`, `recommended_need`, `package`, `first_step_cost_usd`, `package_cost_usd`, `priority_rank`
- Costs come from the reference table `intervention_costs` (one rough estimate per need, labelled as an estimate).

**`dashboard_resources`** (C, one row per resource, mock data in `resources`)
- `id`, `name`, `kind` (`equipment`, `funding`, `expertise`), `need` (NULL = any), `quantity`, `unit`, `value_usd`, `location`, `provider`
- `schools_wanting` (need anywhere in the package), `schools_ready` (need is first), `schools_blocked` (something comes first), `unlock_need` (most common first step for the blocked schools), `unlock_cost_usd` (estimated cost of those first steps)

### RPC
- `set_assessment_verified(assessment_id uuid, verified boolean) returns void`
- `set_milestone_verified(milestone_id uuid, verified boolean) returns void`: confirms a done milestone. When every milestone of a project is done and verified, the project becomes `completed` and its partner gains a delivered project and becomes `proven` (trust earned by delivery).
- Both callable by `authenticated`.

Partners report milestones from the chat: `DONE PJ-104` (or `FAIT`) plus a photo marks the project's next pending milestone done and unverified (`reported_via_chat` true). Projects have a short `code` for this. The webhook uses the internal RPCs `find_project_for_milestone` and `report_milestone` (service role only).

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

### Weekly attendance

A returning reporter who has reported a school gets a home menu: 1 Report a school / 2 Weekly attendance. Attendance asks two numbers (students who came this week, students enrolled) and saves them for the school from that reporter's latest report. `ATT 212 250` (or `PRESENCE 212 250`) does the same in one message from anywhere, which suits SMS; a report in progress is kept. Counts are aggregate only. The webhook saves them with the internal RPC `submit_attendance(p_reporter_id, p_present, p_enrolled)` (service role only), one row per school per week (Monday start, Douala time); sending again that week replaces the numbers.

### Web chat (judge demo)

Twilio's free trial no longer lets us point the WhatsApp sandbox at our webhook, and we are not paying for anything. So judges use a **WhatsApp-style web chat** (`web/index.html`) opened from a QR code: no app, no join step, greeting in under 2 seconds. It calls the `web-chat` Edge Function, which runs the conversation engine against the real database. Web reporters have no phone number: they are identified by a salted hash of a random browser id, and `phone_e164` / `phone_last4` are NULL. Numbered options are shown as tappable buttons.

## 9. Architecture (keep it light)

- **The engine is a function:** `(session, inboundMessage) => { nextSession, replies }`. Keeping it free of I/O makes it easy to test and to run in the CLI simulator.
- **The flow is a config array of steps** (prompt per language, options, next step). Don't build a generic workflow framework.
- **The inbound processor does the basics:** load the session, run the engine, save, return the replies. The web chat Edge Function and the simulator both call it.

## 10. Seed and demo data

- 5 fictional schools for a clean pitch: three Tier 2 and two Tier 1, one of them in a sensitive region (SW) so the privacy behaviour is visible. The presenter adds a Tier 0 school live from the chat.
- English and French names and notes matching the region. Names must be clearly fictional.
- Realistic spread, chosen so each rule shows up:
  - Solar schools wanting computers.
  - Good infrastructure wanting teacher training.
  - Laptops but no electricity (Tier 1 cap, "fund power first").
  - No unsafe buildings in the seed: the live Tier 0 report shows the safety-first rule.
- Some schools with 2 to 3 assessments.
- Mix of verified and unverified.
- A few seeded placeholder building photos are welcome.
- The seed also creates a demo staff user from `DEMO_STAFF_EMAIL` and `DEMO_STAFF_PASSWORD`, with email confirmed.
- `npm run seed` clears app data (not regions) and reseeds.

## 11. Commands

The project should expose these npm scripts:

- `npm run test`: engine tests
- `npm run seed`: reset and seed demo data
- `npm run simulate`: terminal chat with the engine, no browser or phone needed
- `npm run db:push`: apply migrations to the linked project
- `npm run functions:deploy`: deploy the `web-chat` Edge Function
- `npm run dashboard:build`: build the Lovable dashboard into `web/dashboard/` (served by GitHub Pages at `/ps43-bridge/dashboard/`). It is a generated copy: don't edit it by hand.

Lint and typecheck scripts are nice to have, not blockers.

## 12. Done means

- **The demo path works end to end:**
  - Seeded dashboard data shows up.
  - A web chat submission appears on the dashboard (the same engine would serve WhatsApp and SMS).
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

B, C and D are mock data and simple rules only, except weekly attendance, which the bot collects for real (section 8). No real partner onboarding or project workflows.