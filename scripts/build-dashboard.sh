#!/usr/bin/env bash
# Builds the staff dashboard (dashboard/) as a static single-page app into web/dashboard, so GitHub Pages
# serves it at https://fnoorx.github.io/ps43-bridge/dashboard/ next to the web chat.
# The dashboard source is not changed: the Pages config is a temporary file, removed after the build.
# The demo staff login from .env is built in, so visitors skip the sign-in screen.
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
# The demo staff login from .env, so the published dashboard signs itself in (fictional data only).
env_value() { { grep -E "^$1=" "$here/.env" 2>/dev/null || true; } | head -1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']$//"; }
export VITE_DEMO_EMAIL="$(env_value DEMO_STAFF_EMAIL)"
export VITE_DEMO_PASSWORD="$(env_value DEMO_STAFF_PASSWORD)"
[ -n "$VITE_DEMO_EMAIL" ] && [ -n "$VITE_DEMO_PASSWORD" ] || echo "Note: no DEMO_STAFF_EMAIL/PASSWORD in .env, so the dashboard will ask visitors to sign in."

npx vite build --config vite.pages.config.ts

rm -rf "$out"
cp -R dist/client "$out"
mv "$out/_shell.html" "$out/index.html"
# Pages has no rewrites: deep links like /dashboard/needs fall back to the site's 404.html,
# which is the same app shell, and the router takes it from there.
cp "$out/index.html" "$here/web/404.html"
echo "Built $(git rev-parse --short HEAD) into web/dashboard. Commit web/ and push to publish."
