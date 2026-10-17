# PS43 Foundation staff dashboard

A web dashboard for PS43 Foundation staff: partner reports, educational needs,
project deployments, plus a live schools dashboard backed by the foundation's
database.

Built with TanStack Start, TypeScript, React and Tailwind CSS.

## Connect your database

The dashboard reads from the foundation's Supabase project. Two connection
values are needed — the **project URL** and the **anon (public) key** — both
from Supabase → Project Settings → API.

- Running locally or on your own host: copy `.env.example` to `.env`, fill in
  both values, then start the app. `.env` is git-ignored and never committed.
- No `.env` at all: the app falls back to the connection values in
  `src/lib/ps43.ts`, so the preview works out of the box.

These are publishable, browser-safe credentials. Keep any service-role key or
other secret out of the repository entirely.

## Development

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
cp .env.example .env   # then fill in your database values
npm run dev
```

## Pages

- `/` and `/dashboard` — fictional operations workspace (demo data, clearly labelled)
- `/auth` — staff sign-in (email and password, no sign-up)
- `/live-schools` — live school dashboard: map, need ranking, region summaries,
  report history with verification, and photos from private storage

## Notes

- Staff accounts are created in the database project's authentication settings,
  not in the app.
- Deploying: build with `npm run build` and host the output on any static/SSR
  host (e.g. Vercel, Netlify, Cloudflare). Set the two `VITE_` variables in the
  host's environment settings.
