#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
QUIET=0

SUPPORTED_SKILLS=(
  bambu-labs
  cad
  cad-viewer
  gcode
  sdf
  sendcutsend
  srdf
  step-parts
  urdf
)

usage() {
  cat <<'EOF'
Usage:
  scripts/check/check-dev-symlinks.sh [--quiet]

Checks that generated copy targets are linked to their canonical source paths
for development branches.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --quiet)
      QUIET=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

cd "$REPO_ROOT"

errors=()

check_link() {
  local path="$1"
  local expected_target="$2"
  local actual_target

  if [ ! -L "$path" ]; then
    errors+=("$path must be a symlink to $expected_target")
    return
  fi

  actual_target="$(readlink "$path")"
  if [ "$actual_target" != "$expected_target" ]; then
    errors+=("$path points to $actual_target, expected $expected_target")
    return
  fi

  if [ ! -e "$path" ]; then
    errors+=("$path points to missing target $expected_target")
  fi
}

check_link "viewer/packages/cadjs" "../../packages/cadjs"
check_link "viewer/packages/cadpy" "../../packages/cadpy"
check_link "skills/cad/scripts/packages/cadpy" "../../../../packages/cadpy"
check_link "skills/cad-viewer/scripts/viewer" "../../../viewer"
check_link "skills/urdf/scripts/packages/cadpy_metadata" "../../../../packages/cadpy_metadata"
check_link "skills/srdf/scripts/packages/cadpy_metadata" "../../../../packages/cadpy_metadata"
check_link "skills/sdf/scripts/packages/cadpy_metadata" "../../../../packages/cadpy_metadata"

for skill in "${SUPPORTED_SKILLS[@]}"; do
  check_link "plugins/cad/skills/$skill" "../../../skills/$skill"
done

if [ "${#errors[@]}" -gt 0 ]; then
  if [ "$QUIET" -eq 0 ]; then
    echo "Development symlink layout is invalid:" >&2
    for error in "${errors[@]}"; do
      echo "- $error" >&2
    done
    echo "" >&2
    echo "Run scripts/dev/link-generated-copies.sh on the dev branch." >&2
  fi
  exit 1
fi

if [ "$QUIET" -eq 0 ]; then
  echo "Development symlink layout is valid."
fi
