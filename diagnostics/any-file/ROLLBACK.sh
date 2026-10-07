#!/usr/bin/env bash
set -euo pipefail
here="$(cd -- "$(dirname -- "$0")" && pwd)"
target="${1:?Pass a copy path to restore}"
cp -- "$here/ORIGINAL.tsx" "$target"
cmp -s -- "$here/ORIGINAL.tsx" "$target"
echo 'ROLLBACK_MATCH=True'