# Pont

Pont (French for "bridge") helps the PS43 Foundation find and respond to school needs in Cameroon.
Field partners report a school's needs over WhatsApp or SMS. PS43 staff see them on a dashboard.

This repo owns the database (schema, views, security, seed data), the conversation engine,
the Twilio webhook and a terminal simulator. The staff dashboard is a separate Lovable project that reads from
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

## WhatsApp setup (Twilio sandbox)

The bot runs as the `twilio-webhook` Supabase Edge Function. WhatsApp and SMS share it.

1. In Twilio, open Messaging > Try it out > Send a WhatsApp message. Note the sandbox number
   and join code. Add `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` to `.env`.

2. Set the function secrets (Supabase provides its own URL and service role key automatically).
   `PHONE_HASH_SALT` must be the same value as in `.env`:

   ```sh
   supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... PHONE_HASH_SALT=... \
     PUBLIC_WEBHOOK_URL=https://<project-ref>.supabase.co/functions/v1/twilio-webhook
   ```

3. Deploy:

   ```sh
   npm run functions:deploy
   ```

4. In the Twilio sandbox settings, set "When a message comes in" to the `PUBLIC_WEBHOOK_URL`
   above, method `POST`, and save.

5. From your phone, send the join code (for example `join purple-tiger`) to the sandbox number,
   then send any message. You should get a reply.

Notes:
- Requests are checked against the Twilio signature, so the URL in Twilio must exactly match
  `PUBLIC_WEBHOOK_URL`.
- Sandbox participants must rejoin after 3 days of inactivity.
- On a Twilio trial, SMS replies only reach phone numbers verified in your Twilio console.
- Logs: Supabase dashboard > Edge Functions > twilio-webhook > Logs.

## Demo day checklist

1. **Reset the data** (removes test submissions, reloads the fictional schools):
   `npm run demo:reset` (same as `npm run seed`)
2. **Print or show the join card.** Add `TWILIO_WHATSAPP_NUMBER` and `TWILIO_SANDBOX_JOIN_CODE`
   to `.env`, then run `npm run demo:card` and open `demo/join-card.html`. The QR opens
   WhatsApp with the join message ready.
3. **Warm up the webhook** a minute before judging, so the first judge does not wait for a
   cold start (about 2 seconds). Any request wakes it; this one is rejected harmlessly:
   `curl -s -o /dev/null -X POST https://<project-ref>.supabase.co/functions/v1/twilio-webhook`
4. **Rejoin the sandbox** from your own phone if you have not used it for 3 days.
5. **Check the dashboard is logged in** and refreshing (it polls every few seconds).
6. **Have a fallback:** `npm run simulate -- --live` on a laptop does the same flow without
   a phone, and the report still appears on the dashboard.

Timing: the server answers each message in about 0.6 seconds (17 replies, about 12 seconds in
total). The 3-minute target is mostly reading and typing; skipping the optional note keeps it
comfortable.

## Prototype status

This is a hackathon prototype built on fictional data.

| Pipeline stage | In this prototype |
|---|---|
| Report | Real: WhatsApp/SMS bot, saved to Supabase, shown on the dashboard |
| Assess | Real rules: `dashboard_readiness` scores every school live (Tier 0/1/2) |
| Match | Real rules on mock partners: `dashboard_partner_matches` |
| Deliver | Mock projects and photo milestones |
| Prove | Mock weekly attendance and an impact summary |

## What a real pilot would add

- **Verified partner onboarding:** real partner sign-up, reference checks and a referral workflow, instead of mock partners.
- **Project management:** staff create projects, assign partners and approve milestone photos from the dashboard.
- **Attendance by SMS:** a short weekly SMS flow for headteachers to report attendance counts.
- **School matching:** recognise when two reports are about the same school, instead of creating a new school each time.
- **WhatsApp Business API:** a dedicated, verified number instead of the Twilio sandbox (no join code, no 3-day rejoin).
- **Message templates:** approved WhatsApp templates so PS43 can message reporters first (reminders, follow-ups).
- **Voice notes:** transcription and translation of voice notes for staff.
- **Media moderation:** check photos before staff see them, and enforce "building only, no people".
- **Data retention:** automatic deletion of raw phone numbers and old sessions, plus a way for reporters to ask for deletion.
- **Stronger privacy:** per-partner access rules, an audit trail of staff actions, and a reviewed list of sensitive regions.
- **Operations:** monitoring and alerts on the webhook, retries for failed media downloads, and backups.
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
| `npm run functions:deploy` | Deploy the WhatsApp/SMS webhook Edge Function |
| `npm run demo:reset` | Reset to the fictional demo data before judging (alias of `seed`) |
| `npm run demo:card` | Build the printable judge join card with QR code (`demo/join-card.html`) |

## Layout

```
src/lib/          privacy utilities (phone hashing, coordinate rounding)
src/engine/       conversation engine: flow config, bilingual strings, parsing
src/messaging/    Twilio parsing, TwiML replies, signature check
src/webhook/      webhook handler and Supabase store
supabase/functions/twilio-webhook/  Edge Function entry point
scripts/          seed, verify-contract, simulate
supabase/         config and migrations
docs/             dashboard contract
```
