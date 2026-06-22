#!/usr/bin/env bash
# Build a macOS .mcpb Desktop Extension bundle.
# The bundle includes the compiled dist/ (with JXA scripts) and production node_modules.
# There is no native binary (SQLite reads use the built-in node:sqlite), so the
# bundle is portable across Intel and Apple Silicon — it only requires Node >= 22.5.
set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="$(pwd)"
STAGE="$ROOT/mcpb-build"
OUT="$ROOT/postmaster.mcpb"

echo "==> building TypeScript"
npm run build >/dev/null

echo "==> staging bundle at $STAGE"
rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE"
cp -R dist "$STAGE/dist"
cp manifest.json package.json LICENSE-MIT LICENSE-APACHE NOTICE README.md "$STAGE/"

echo "==> installing production dependencies into the bundle"
( cd "$STAGE" && npm install --omit=dev --no-audit --no-fund >/dev/null )

echo "==> packing .mcpb"
npx --yes @anthropic-ai/mcpb pack "$STAGE" "$OUT"

echo "==> cleaning staging"
rm -rf "$STAGE"
echo "done: $OUT"
