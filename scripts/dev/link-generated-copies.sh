#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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
  scripts/dev/link-generated-copies.sh

Replaces generated copy targets with symlinks to their canonical source paths
for development branches. Run scripts/build.sh --clean to materialize the
same paths for release branches.
EOF
}

if [ "$#" -gt 0 ]; then
  case "$1" in
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
fi

cd "$REPO_ROOT"

link_path() {
  local path="$1"
  local target="$2"

  if [ -L "$path" ] && [ "$(readlink "$path")" = "$target" ]; then
    echo "Already linked $path -> $target"
    return
  fi

  if [ -e "$path" ] || [ -L "$path" ]; then
    rm -rf "$path"
  fi

  mkdir -p "$(dirname "$path")"
  ln -s "$target" "$path"
  echo "Linked $path -> $target"
}

link_path "viewer/packages/cadjs" "../../packages/cadjs"
link_path "viewer/packages/cadpy" "../../packages/cadpy"
link_path "skills/cad/scripts/packages/cadpy" "../../../../packages/cadpy"
link_path "skills/cad-viewer/scripts/viewer" "../../../viewer"
link_path "skills/urdf/scripts/packages/cadpy_metadata" "../../../../packages/cadpy_metadata"
link_path "skills/srdf/scripts/packages/cadpy_metadata" "../../../../packages/cadpy_metadata"
link_path "skills/sdf/scripts/packages/cadpy_metadata" "../../../../packages/cadpy_metadata"

mkdir -p "plugins/cad/skills"
for skill in "${SUPPORTED_SKILLS[@]}"; do
  link_path "plugins/cad/skills/$skill" "../../../skills/$skill"
done

scripts/check/check-dev-symlinks.sh
