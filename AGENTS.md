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

- Keep external school access isolated at `/live-schools` and staff login at `/auth`; `/` and `/dashboard` show the fictional operations overview because the external schema must remain untouched.
- Keep simulation state in OperationsProvider and domain calculations in `src/lib/operations.ts` so navigation preserves edits and rules can be tested without UI rendering.
- Use one shared OperationsShell with separate content routes for operations navigation, with leaf metadata on every page.
