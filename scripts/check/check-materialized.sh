#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

check_no_symlinks() {
  local root="$1"
  local first_link

  if [ ! -e "$root" ]; then
    echo "Missing materialized path: $root" >&2
    exit 1
  fi

  first_link="$(find "$root" -type l -print -quit)"
  if [ -n "$first_link" ]; then
    echo "Materialized release paths must not contain symlinks." >&2
    echo "First symlink: $first_link" >&2
    echo "Run scripts/build.sh --clean and commit the generated outputs." >&2
    exit 1
  fi
}

check_no_symlinks "viewer/packages"
check_no_symlinks "skills/cad/scripts/packages"
check_no_symlinks "skills/cad-viewer/scripts/viewer"
check_no_symlinks "skills/urdf/scripts/packages"
check_no_symlinks "skills/srdf/scripts/packages"
check_no_symlinks "skills/sdf/scripts/packages"
check_no_symlinks "plugins/cad/skills"

scripts/check-version.sh
scripts/build.sh --check
scripts/check/validate-plugins.sh

echo "Materialized release layout is valid."
