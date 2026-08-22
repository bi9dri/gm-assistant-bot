#!/usr/bin/env bash
# Ensures bun's version stays identical across devbox.json (source of truth,
# since devbox/nixhub lags npm) and every package.json's packageManager /
# devDependencies["@types/bun"].
set -euo pipefail
cd "$(dirname "$0")/.."

devbox_bun=$(jq -r '.packages[] | select(startswith("bun@")) | ltrimstr("bun@")' devbox.json)
if [[ -z "$devbox_bun" ]]; then
  echo "error: no bun@X.Y.Z entry found in devbox.json packages" >&2
  exit 1
fi

fail=0
while IFS= read -r pkg; do
  pm=$(jq -r '.packageManager // empty' "$pkg")
  if [[ -n "$pm" && "$pm" != "bun@$devbox_bun" ]]; then
    echo "mismatch: $pkg packageManager=$pm, expected bun@$devbox_bun (devbox.json)" >&2
    fail=1
  fi

  types_bun=$(jq -r '.devDependencies["@types/bun"] // empty' "$pkg")
  if [[ -n "$types_bun" && "$types_bun" != "$devbox_bun" ]]; then
    echo "mismatch: $pkg @types/bun=$types_bun, expected $devbox_bun (devbox.json)" >&2
    fail=1
  fi
done < <(find . -name package.json -not -path '*/node_modules/*')

if [[ "$fail" -eq 0 ]]; then
  echo "bun version consistency OK: $devbox_bun"
fi
exit "$fail"
