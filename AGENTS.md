# AGENTS.md

Guidance for AI coding agents and humans working in this repo. Read this fully before writing code.

## 1. Project overview

**Product:** Pont (French for "bridge").
**Event:** Hackathon, Team #30, "Building Bridges to Education".
**Sponsor:** PS43 Foundation (nonprofit founded by Pascal Siakam). It is based in Toronto and is expanding its education work into Cameroon.

**Challenge:** Help PS43 identify educational needs, connect resources and trusted local partners, and deploy educational infrastructure across communities in Cameroon, using appropriate technology.

**Our product pipeline:** Report → Assess → Match → Deliver → Prove

| Component | What it does | Status |
|---|---|---|
| **A. Field intake + dashboard** | WhatsApp bot (SMS fallback) collects school needs; PS43 dashboard shows map, ranked needs, pipeline | **Building now** |
| B. Readiness score + recommender | Scores schools, recommends Tier 0/1/2 intervention | Later |
| C. Trusted partner network | Referral-based partner profiles, trust earned via delivery | Later |
| D. Milestones + impact | Photo-verified milestones, weekly attendance by SMS | Later |

Only build A for now. Design the data model so B, C and D can plug in later without migrations that break existing data (see section 6).

## 2. Repos and ownership

There are two codebases. Supabase is the contract between them.

| Repo | Built with | Owns |
|---|---|---|
| `ps43-pont` (this repo) | TypeScript, Supabase CLI | Database schema, migrations, views, RLS, RPC functions, storage config, seed data, conversation engine, Twilio webhook, CLI simulator |
| `ps43-pont-dashboard` | Lovable (React + Supabase) | Staff dashboard UI only |

Rules:
- **Schema:** This repo is the single source of truth for the database. The dashboard never creates or alters tables, views or policies.
- **Read access:** The dashboard reads only from the `dashboard_*` views (section 7).
- **Write access:** The dashboard's only write is the `set_assessment_verified` RPC.
- **Breaking changes:** Changing any view column, enum value, or RPC signature breaks the dashboard. When unavoidable:
  - Update section 7.
  - Update `docs/DASHBOARD_CONTRACT.md` in the same change.
  - Tell the team.

## 3. Why WhatsApp

PS43's executive director stated that WhatsApp is how they communicate and coordinate today. Field users should never need to download an app, create an account, or open a web page. Messages queue on the phone and send when signal returns, which gives us offline-tolerant behaviour for free.

## 4. Users and channels

| User | Channel | Notes |
|---|---|---|
| Local partner / coordinator | WhatsApp | Smartphone, patchy data. Primary reporter. |
| Headteacher / teacher | WhatsApp or SMS | May only have a basic phone. |
| Community member | WhatsApp or SMS | Optional reporter; submissions unverified by default. |
| PS43 staff (Toronto) | Web dashboard (Lovable) | Small, non-technical team. Laptop, good internet. |

## 5. Hard constraints (do not violate)

### Low bandwidth, low literacy friendly
- Every bot message is short: aim for under 300 characters, never over 600.
- Questions are multiple choice with numbered options. Users reply with a number.
- Also accept obvious free-text equivalents (e.g. "yes", "oui", "1", "un").
- Optional steps (photo, location, voice note) can always be skipped with a single reply.
- Don't send images, links, or formatting the user must render to understand a message.
- Don't use emojis to carry meaning.
- The SMS path must work with plain text only (no media, no buttons). Keep SMS messages within 2 segments where possible.

### Bilingual from day one
- Every user-facing bot string exists in English and French. No hardcoded strings in logic.
- Language is chosen at the first message and stored on the reporter.
- French is the default fallback, since most of Cameroon is francophone.

### Resumable conversations
- Session state is persisted in the database, never in memory.
- If a user returns after a gap, offer to continue or start over.
- Sessions expire after 72 hours of inactivity.
- Global commands work at any step:
  - `MENU`
  - `RESTART` / `RECOMMENCER`
  - `HELP` / `AIDE`
  - `BACK` / `RETOUR`
- Invalid input re-asks the same question with a short hint. Never crash, never dead-end.

### Privacy and safety
Parts of Cameroon are conflict-affected (Northwest, Southwest, Far North), and schools there have been attacked. Location data is sensitive.

- **Consent:** Show a consent message before collecting anything. If declined, collect nothing and end politely.
- **No student data:**
  - Never collect student names, ages, photos of children's faces, or other student-level data.
  - Collect only aggregate counts.
  - Photo prompts ask for the building, not people.
- **Location precision:**
  - Exact coordinates are stored only in restricted columns on raw tables.
  - Dashboard views expose coordinates rounded to 1 decimal place (about 11 km).
  - For sensitive schools, coordinates are null in views. Only region-level aggregates are shown.
- **Sensitive regions:** Keep the list in the `regions` table (`is_sensitive`). Default sensitive: `NW`, `SW`, `EN`.
- **Phone numbers:**
  - Store them as a salted SHA-256 hash plus the last 4 digits.
  - Raw numbers are kept only in `reporters.phone_e164`, which no view exposes, so the bot can reply.
- **Database access:**
  - `anon` has no access to anything.
  - `authenticated` (dashboard staff) can read only the `dashboard_*` views and call `set_assessment_verified`.
  - The service role is used only by the webhook and seed scripts, never in the dashboard.
- **Secrets:** Keep them in environment variables only. Never commit `.env`. Never give the service role key to Lovable or anyone working on the dashboard.

### Sustainability and cost
PS43 has no engineering staff. Everything must run on managed services with free or near-free tiers:
- No custom servers.
- No Kubernetes.
- No blockchain.
- No ML models.

Readiness logic (later, B) is transparent rules, not AI.

## 6. Tech stack (this repo)

- **Language:** TypeScript (strict).
- **Database, auth, storage, hosting for webhook:** Supabase.
  - Migrations live in `supabase/migrations`, managed with the Supabase CLI.
  - The Twilio webhook runs as a Supabase Edge Function (Deno).
- **Conversation engine:** plain TypeScript in `src/engine`.
  - It must use no Node-only or Deno-only APIs, so the same code runs in Vitest (Node), the CLI simulator (Node via `tsx`), and the Edge Function (Deno).
- **Messaging:** Twilio.
  - Use the WhatsApp Sandbox for development and demo; SMS uses the same webhook.
  - Keep the messaging layer behind an interface so Meta Cloud API can replace Twilio later.
- **Validation:** zod.
- **Tests:** Vitest.
- **Scripts:** `tsx` for seed and simulator.

Twilio media URLs require auth. Download media server-side and upload to the `field-media` bucket. Never store or render Twilio URLs.

## 7. Database contract

### Value sets (text columns with CHECK constraints, not Postgres enums)

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
| `session status` | `active`, `completed`, `abandoned` |
| `media type` | `photo`, `audio` |

### Raw tables (no direct access for `anon` or `authenticated`)

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
  - `flow`
  - `step`
  - `answers` (jsonb)
  - `status`
  - `updated_at`
- **`schools`**
  - `id`
  - `name`
  - `region_code` (FK)
  - `town`
  - `lat_exact`
  - `lng_exact`
  - `created_at`
- **`assessments`**
  - `id`
  - `ref_code` (unique, e.g. `PS-4F2K`)
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
- **`processed_messages`**
  - `message_sid` (PK)
  - `processed_at`
  - Used for Twilio idempotency.
- **`messages`** (audit log)
  - `id`
  - `reporter_id`
  - `direction`
  - `body`
  - `created_at`

A school can have many assessments. Never overwrite; always append.

Reserved for later, do not build yet:
- `readiness_scores` (B)
- `partners`, `referrals` (C)
- `projects`, `milestones`, `attendance_reports` (D)

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

### Dashboard views (the contract, `authenticated` gets SELECT only)

These views run with owner privileges (not `security_invoker`) so they can read the locked raw tables. This is intentional. The Supabase linter warning about security-definer views is expected. Grant SELECT to `authenticated` only, never `anon`.

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
- `top_need` (most common latest top_need, NULL if none)
- `last_submitted_at`

**`dashboard_media`**
- `id`
- `assessment_id`
- `school_id`
- `type`
- `storage_path`
- `created_at`

### RPC
- `set_assessment_verified(assessment_id uuid, verified boolean) returns void`
  - Runs as `SECURITY DEFINER` with `search_path` pinned.
  - Executable by `authenticated` only.

### Storage
- Private bucket `field-media`.
- `authenticated` may read objects in it (for signed URLs).
- Only the service role writes.

## 8. The school assessment flow

1. **Language:** 1 English / 2 Français
2. **Consent:** explain purpose, what is stored, that no student data is collected. 1 Agree / 2 No
3. **Role:** headteacher, teacher, local partner, community member
4. **School name:** free text
5. **Region:** numbered list of the 10 regions above
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
13. **Photo of the building:** optional; WhatsApp only, skipped automatically on SMS
14. **Location pin:** optional; WhatsApp only
15. **Anything else:** optional free text or voice note
16. **Summary + confirm:** 1 Submit / 2 Start over

After submit, send a short thank-you with the `ref_code`.

## 9. Architecture rules

- **The conversation engine is a pure function:**
  - Signature: `(session, inboundMessage) => { nextSession, outboundMessages }`
  - No I/O inside it.
- **The flow is defined as data:** steps, prompts by language, validators, next-step logic. Adding a question means editing one config entry.
- **The webhook handler is thin:**
  - Verify the Twilio signature (HMAC-SHA1 via Web Crypto).
  - Check `processed_messages` for idempotency.
  - Load the session.
  - Call the engine.
  - Persist.
  - Reply.
- **Webhook speed:** Respond quickly so Twilio does not retry.
- **Privacy utilities:** Phone hashing and coordinate rounding each live in one shared module.

## 10. Seed and demo data

- About 20 fictional schools across at least 6 regions, including some in NW, SW and EN so the privacy behaviour is visible.
- English and French names and notes matching the region (anglophone in NW/SW). Names must be clearly fictional.
- Realistic spread:
  - Unsafe buildings with no power.
  - Solar schools wanting computers.
  - Good infrastructure wanting teacher training.
- Some schools have 2 to 3 assessments over time.
- Mix of verified and unverified.
- Seed one demo staff user via the Supabase Admin API using `DEMO_STAFF_EMAIL` and `DEMO_STAFF_PASSWORD` from env.
- `npm run seed` wipes app data (not regions) and reseeds. It must be safe to run repeatedly.

**Demo goal:** A judge scans a QR code, joins the Twilio sandbox, completes the flow on their own phone in under 3 minutes, and sees their school appear on the dashboard live.

## 11. Commands

The project should expose these npm scripts:

- `npm run test`: Vitest
- `npm run lint`: ESLint
- `npm run typecheck`: `tsc --noEmit`
- `npm run seed`: reset and seed demo data in the linked Supabase project
- `npm run simulate`: terminal chat that drives the engine, no Twilio needed
- `npm run db:push`: apply migrations to the linked project
- `npm run functions:deploy`: deploy the webhook Edge Function

## 12. Definition of done (per change)

- Typecheck, lint and tests pass.
- New bot strings have English and French versions.
- Anything touching location or phone goes through the privacy utilities.
- Any change to section 7 is mirrored in `docs/DASHBOARD_CONTRACT.md`.
- No secrets committed. `.env.example` is updated when variables are added.

## 13. Writing style

- Plain, warm, respectful. Short sentences.
- No em dashes in any written output (copy, docs, comments). Use commas, colons, or parentheses.
- Bot copy should sound like a helpful coordinator, not a form.

## 14. Out of scope for now

- Readiness scoring (B).
- Partners (C).
- Projects, milestones, attendance (D).
- IVR or missed-call voice flows.
- Production WhatsApp Business API onboarding.
- Payments or mobile money.
- Any dashboard UI code in this repo.

If a task seems to need any of these, stop and flag it.