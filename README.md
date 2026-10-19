# Pont

Pont (French for "bridge") helps the PS43 Foundation find and respond to school needs in Cameroon.
Headteachers and local partners report a school's needs in a WhatsApp-style chat, in English or French.
PS43 staff see every report on a dashboard that says who to help first, what to fund first, and who can deliver it.

Team #30, PS43 Foundation challenge. A hackathon prototype on fictional data.

## Try it

- **Staff dashboard:** https://fnoorx.github.io/pont/ (the home page; opens straight in: the published demo signs in with a demo staff account)
- **Report a school (the chat):** https://fnoorx.github.io/pont/chat/ (no app or sign-up; on a laptop it opens a phone view with a QR code). Linked from every dashboard page, and its back arrow returns to the dashboard.

Send a report in the chat and it appears on the dashboard within 10 seconds.

## How it works

| Step | What happens | In this prototype |
|---|---|---|
| **Report** | A headteacher or partner answers short numbered questions in the chat | Live |
| **Assess** | Simple rules score readiness (building, power, signal, devices) and set what comes first: safe building, then power, then devices, then internet | Live |
| **Match** | Partners and resources are matched to the first thing the school needs | Live rules on sample partners and resources |
| **Deliver** | Partners report milestones from the chat (`DONE PJ-104` plus a photo); staff confirm them, and partners earn trust by delivering | Sample projects, live updates from the chat |
| **Prove** | Headteachers send weekly attendance from the chat (`ATT 212 250` works by SMS) | Live counts next to sample history |

**Designed for the field**
- **Chat first:** PS43 already coordinates over WhatsApp. No app to install, and messages wait for signal and send by themselves.
- **Bilingual:** every message in English and French.
- **Basic phones:** the same questions work over SMS as plain text.
- **Privacy for conflict regions:** a consent step, nothing about students, locations rounded to about 11 km, and no map pins in the Northwest, Southwest or Far North. Staff see a reporter's role and the last 4 digits of their phone only.
- **Low cost:** free tiers only (Supabase, GitHub Pages). Rules, not AI, so staff can explain every recommendation.

Why a web chat and not real WhatsApp? Twilio's and Meta's free tiers block it. The engine does not depend on the channel, so a WhatsApp Business number is a thin adapter in front of the same code.

## Pilot roadmap

**12 weeks, 10 schools, 3 local partners, in Littoral and Centre.** What we would validate:
- Do partners and headteachers keep reporting from the chat?
- Do PS43 staff agree with Pont's recommended first steps?
- Does attendance rise after a funded first step?

A real pilot would add: a verified WhatsApp Business number and an SMS gateway, real partner onboarding with reference checks, school de-duplication, staff-created projects, voice notes, photo moderation, and automatic deletion of phone numbers and old sessions.

## Repo layout

```
src/engine/      conversation engine: questions, bilingual copy, rules for each step
src/webhook/     processes each message (shared by the web chat and the simulator)
src/webchat/     web chat endpoint
src/lib/         privacy helpers (phone hashing, coordinate rounding)
supabase/        database schema, dashboard views and the web-chat Edge Function
scripts/         seed data, contract check, terminal simulator
web/             the site on GitHub Pages: home (opens the dashboard), chat/, and the built dashboard/
dashboard/       staff dashboard source (React + Supabase, first built in Lovable)
docs/            what the dashboard reads from the database
```

[AGENTS.md](AGENTS.md) has the full design and rules.

## Run it yourself

Needs Node 20.12+ and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
npm install
supabase login && supabase link --project-ref <project-ref>
cp .env.example .env              # fill in from Supabase > Project Settings > API
npm run db:push                   # database schema and views
npm run seed                      # fictional demo data and the demo staff login
supabase secrets set PHONE_HASH_SALT=...   # same value as in .env
npm run functions:deploy          # the web chat backend
```

In Supabase, turn off "Allow new users to sign up" (Authentication > Providers > Email) so only the staff account can read the dashboard.

| Command | What it does |
|---|---|
| `npm run test` | Unit tests |
| `npm run simulate` | Chat with the bot in your terminal (`-- --sms` for the SMS path, `-- --live` to save to Supabase) |
| `npm run demo:reset` | Reset to the fictional demo data |
| `npm run dashboard:build` | Build the dashboard into `web/dashboard/` (then commit and push to publish) |
