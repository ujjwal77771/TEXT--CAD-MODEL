#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  scripts/dev.sh [--check]

Sets up the repository's development layout by replacing generated-copy
directories with symlinks to their canonical sources.

Options:
  --check     Verify the development symlink layout without changing files.
  -h, --help  Show this help.
EOF
}

MODE="write"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --check)
      MODE="check"
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

if [ "$MODE" = "check" ]; then
  "$SCRIPT_DIR/check/check-dev-symlinks.sh"
else
  "$SCRIPT_DIR/dev/link-generated-copies.sh"
fi
