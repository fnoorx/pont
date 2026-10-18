# Pont

Pont (French for "bridge") helps the PS43 Foundation find and respond to school needs in Cameroon.
Field partners report a school's needs over WhatsApp or SMS. PS43 staff see them on a dashboard.

This repo owns the database (schema, views, security, seed data), the conversation engine,
the web chat backend and a terminal simulator. The staff dashboard is a separate Lovable project that reads from
this database. See [AGENTS.md](AGENTS.md) for the full design and rules, and
[docs/DASHBOARD_CONTRACT.md](docs/DASHBOARD_CONTRACT.md) for what the dashboard can use.

## Setup

You need Node 20.12 or newer and the [Supabase CLI](https://supabase.com/docs/guides/cli).

1. Install dependencies:

   ```sh
   npm install
   ```

2. Log in to Supabase and link this repo to the project:

   ```sh
   supabase login
   supabase link --project-ref <project-ref>
   ```

3. Create your `.env` from the example and fill it in (Supabase dashboard > Project Settings > API):

   ```sh
   cp .env.example .env
   ```

   `PHONE_HASH_SALT` should be a long random string. Do not change it once real data exists.
   Never commit `.env`, and never share the service role key with the dashboard.

4. Apply the database migrations:

   ```sh
   npm run db:push
   ```

5. Load the demo data and create the demo staff login:

   ```sh
   npm run seed
   ```

   This wipes app data (not regions) and reseeds, so it is safe to run again.

6. Check the dashboard contract end to end, using only the anon key:

   ```sh
   npx tsx scripts/verify-contract.ts
   ```

7. In the Supabase dashboard, go to Authentication > Providers > Email and turn off
   "Allow new users to sign up". Otherwise anyone with the anon key could create an account
   and read the dashboard views. The verify script warns if this is still on.

8. Deploy the web chat Edge Function. Supabase provides its own URL and service role key;
   `PHONE_HASH_SALT` must be the same value as in `.env`:

   ```sh
   supabase secrets set PHONE_HASH_SALT=...
   npm run functions:deploy
   ```

   Logs: Supabase dashboard > Edge Functions > web-chat > Logs.

## Web chat (what judges use)

`web/index.html` is a WhatsApp-style chat page. Judges scan a QR code and the bot greets them
in under 2 seconds, with no app, sign-up or join code. It talks to the `web-chat` Edge Function,
which runs the conversation engine against the real database, so reports appear on the
dashboard live. Numbered answers become tappable buttons, and the + button sends a photo or
location.

**Live:** https://fnoorx.github.io/ps43-bridge/ (published from `web/` by GitHub Pages on every push
that changes it, see `.github/workflows/pages.yml`).

**Presentation view:** https://fnoorx.github.io/ps43-bridge/present.html shows the same live chat
inside a black iPhone frame, with a QR code so judges can try it. On a laptop, the main link opens
this view automatically (phones get the plain chat; add `?plain` to force the plain chat). Click
the phone to drive the chat; "Restart chat" starts fresh and **P** hides the side panel. The chat
is always light mode (add `?theme=dark` to the chat link for dark).
To try it locally: `cd web && python3 -m http.server 8765` and open http://localhost:8765.

Why not real WhatsApp for judges? Twilio's free trial blocks setting the sandbox webhook, and
Meta's free test number only replies to 5 pre-registered phones. The engine is channel-agnostic
(it already handles the SMS path, see `npm run simulate -- --sms`), so a real WhatsApp provider
is a thin adapter in front of the same inbound processor.

## Staff dashboard (live)

**Live:** https://fnoorx.github.io/ps43-bridge/dashboard/ (sign in with the demo staff account,
`DEMO_STAFF_EMAIL` / `DEMO_STAFF_PASSWORD`).

The dashboard is built and edited in Lovable ([cameroon-compass](https://github.com/Firetes675/cameroon-compass)).
To publish its latest version, run `npm run dashboard:build` (expects the repo cloned next to this
one, or pass its path), then commit `web/` and push. The script pulls the dashboard, builds it as a
static single-page app into `web/dashboard/` (plus `web/404.html` so deep links work), and leaves
the dashboard repo unchanged. The live copy only changes when you rebuild, so a teammate's edit in
Lovable can't break the demo mid-judging.

## Demo day checklist

1. **Reset the data** (removes test submissions, reloads the fictional schools):
   `npm run demo:reset` (same as `npm run seed`)
2. **Open the presentation view** (link above). Its QR code opens the web chat directly.
3. **Warm up the Edge Function** a minute before judging, so the first judge does not wait for a
   cold start (about 2 seconds). Any request wakes it; this one is rejected harmlessly:
   `curl -s -o /dev/null -X POST https://<project-ref>.supabase.co/functions/v1/web-chat`
4. **Check the dashboard is logged in** and refreshing (it polls every few seconds).
5. **Have a fallback:** `npm run simulate -- --live` on a laptop does the same flow without
   a phone, and the report still appears on the dashboard.

Timing: the server answers each message in about 0.6 seconds (17 replies, about 12 seconds in
total). The 3-minute target is mostly reading and typing; skipping the optional note keeps it
comfortable.

## Prototype status

This is a hackathon prototype built on fictional data.

| Pipeline stage | In this prototype |
|---|---|
| Report | Real: WhatsApp-style chat bot (SMS path in the simulator), saved to Supabase, shown on the dashboard |
| Assess | Real rules: `dashboard_readiness` scores every school live (Tier 0/1/2) |
| Match | Real rules on mock partners: `dashboard_partner_matches` |
| Deliver | Mock projects; partners report milestones from the chat (`DONE PJ-104` + photo), staff confirm them, and partners become Proven by delivering |
| Prove | Real: headteachers send weekly attendance in the chat (or `ATT 212 250`), shown on the Impact page next to seeded history |

## What a real pilot would add

- **Verified partner onboarding:** real partner sign-up, reference checks and a referral workflow, instead of mock partners.
- **Project management:** staff create projects, assign partners and approve milestone photos from the dashboard.
- **School matching:** recognise when two reports are about the same school, instead of creating a new school each time.
- **WhatsApp Business API and SMS:** a dedicated, verified WhatsApp number plus an SMS gateway, both feeding the same engine as the web chat.
- **Message templates:** approved WhatsApp templates so PS43 can message reporters first (reminders, follow-ups).
- **Voice notes:** transcription and translation of voice notes for staff.
- **Media moderation:** check photos before staff see them, and enforce "building only, no people".
- **Data retention:** automatic deletion of raw phone numbers and old sessions, plus a way for reporters to ask for deletion.
- **Stronger privacy:** per-partner access rules, an audit trail of staff actions, and a reviewed list of sensitive regions.
- **Operations:** monitoring and alerts on the Edge Function, retries for failed media downloads, and backups.
- **Offline field tools:** printed QR posters and USSD for areas with no data at all.

## Commands

| Command | What it does |
|---|---|
| `npm run test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run seed` | Reset and seed demo data in the linked project |
| `npm run verify` | Same as `npx tsx scripts/verify-contract.ts` |
| `npm run db:push` | Apply migrations to the linked project |
| `npm run simulate` | Chat with the bot in your terminal (`-- --live` saves to Supabase, `-- --sms` for SMS) |
| `npm run functions:deploy` | Deploy the `web-chat` Edge Function |
| `npm run demo:reset` | Reset to the fictional demo data before judging (alias of `seed`) |
| `npm run dashboard:build` | Build the Lovable dashboard into `web/dashboard/` for GitHub Pages |

## Layout

```
src/lib/          privacy utilities (phone hashing, coordinate rounding)
src/engine/       conversation engine: flow config, bilingual strings, parsing
src/messaging/    inbound message types, SMS (GSM-7) helpers
src/webhook/      inbound processor (shared by web chat and simulator) and Supabase store
src/webchat/      web chat endpoint handler
web/              WhatsApp-style web chat page and presentation view (static)
web/dashboard/    built copy of the Lovable staff dashboard (generated, see npm run dashboard:build)
supabase/functions/  Edge Function entry point (web-chat)
scripts/          seed, verify-contract, simulate
supabase/         config and migrations
docs/             dashboard contract
```
