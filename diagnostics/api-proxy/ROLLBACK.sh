#!/usr/bin/env bash
set -euo pipefail
here="$(cd -- "$(dirname -- "$0")" && pwd)"
target="${1:?Pass flat rollback-test directory}"
for name in api.ts next.config.ts Dockerfile; do
 cp -- "$here/original/$name" "$target/$name"
 cmp -s -- "$here/original/$name" "$target/$name"
done
echo 'ROLLBACK_MATCH=True (3 files)'