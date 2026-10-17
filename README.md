# Pont

Pont (French for "bridge") helps the PS43 Foundation find and respond to school needs in Cameroon.
Field partners report a school's needs over WhatsApp or SMS. PS43 staff see them on a dashboard.

This repo owns the database (schema, views, security, seed data) and, soon, the conversation
engine and Twilio webhook. The staff dashboard is a separate Lovable project that reads from
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

## Commands

| Command | What it does |
|---|---|
| `npm run test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run seed` | Reset and seed demo data in the linked project |
| `npm run verify` | Same as `npx tsx scripts/verify-contract.ts` |
| `npm run db:push` | Apply migrations to the linked project |
| `npm run simulate` | Terminal chat with the bot (not built yet) |
| `npm run functions:deploy` | Deploy the WhatsApp/SMS webhook Edge Function |

## Layout

```
src/lib/          privacy utilities (phone hashing, coordinate rounding)
src/engine/       conversation engine (placeholder for now) and bot strings
src/messaging/    Twilio parsing, TwiML replies, signature check
src/webhook/      webhook handler and Supabase store
supabase/functions/twilio-webhook/  Edge Function entry point
scripts/          seed, verify-contract, simulate
supabase/         config and migrations
docs/             dashboard contract
```
