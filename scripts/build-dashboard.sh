#!/usr/bin/env bash
# Builds the staff dashboard (dashboard/, synced from the Lovable repo cameroon-compass) as a static
# single-page app into web/dashboard, so GitHub Pages serves it at https://fnoorx.github.io/ps43-bridge/dashboard/
# next to the web chat. Run `npm run dashboard:sync` first to pick up the latest Lovable edits.
# The dashboard source is not changed: the Pages config is a temporary file, removed after the build.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
dash="$(cd "${1:-$here/dashboard}" && pwd)"
out="$here/web/dashboard"

cd "$dash"
[ -d node_modules ] || npm install --no-save --package-lock=false

cat > vite.pages.config.ts <<'EOF'
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig({
  nitro: false,
  vite: { base: "/ps43-bridge/dashboard/" },
  tanstackStart: { server: { entry: "server" }, spa: { enabled: true } },
});
EOF
trap 'rm -f "$dash/vite.pages.config.ts"' EXIT
rm -rf dist
npx vite build --config vite.pages.config.ts

rm -rf "$out"
cp -R dist/client "$out"
mv "$out/_shell.html" "$out/index.html"
# Pages has no rewrites: deep links like /dashboard/needs fall back to the site's 404.html,
# which is the same app shell, and the router takes it from there.
cp "$out/index.html" "$here/web/404.html"
echo "Built $(git rev-parse --short HEAD) into web/dashboard. Commit web/ and push to publish."
