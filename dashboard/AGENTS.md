<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Every operations page shows live data. `OperationsProvider` loads the Pont `dashboard_*` views (read only, refreshed every 10 seconds, only when signed in) through `src/lib/live.ts`; staff sign in at `/auth`, and `OperationsShell` sends signed-out visitors there. `/live-schools` is the simple map view.
- The database is owned by the Pont repo (github.com/fnoorx/pont, see `docs/DASHBOARD_CONTRACT.md`). Read only from `dashboard_*` views; the only write is the `set_assessment_verified` RPC. Never create, alter or migrate tables, views or policies from this project, and decline any Lovable-suggested SQL migration.
- Privacy: schools in sensitive regions have no coordinates; show them only in their region marker and never geocode a town. Show reporters by role and last 4 digits only. Partners, projects, milestones and attendance are fictional demo data, so label those pages as demo data.
- Keep label maps and pure helpers in `src/lib/live.ts` so rules can be tested without UI rendering.
- Use one shared OperationsShell with separate content routes for operations navigation, with leaf metadata on every page.
- The external database connection comes from `import.meta.env["VITE_SUPABASE_URL"]` / `["VITE_SUPABASE_ANON_KEY"]` in `src/lib/ps43.ts`, falling back to the baked-in publishable values so the preview runs unconfigured; never hardcode or commit non-publishable credentials.
