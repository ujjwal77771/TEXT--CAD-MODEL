#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON:-python3}"

usage() {
  cat <<'EOF'
Usage:
  scripts/release/bump-version.sh major|minor|patch [options]
  scripts/release/bump-version.sh --set-version X.Y.Z [options]
  scripts/release/bump-version.sh --check
  scripts/release/bump-version.sh --check-incremented-from REF

First-class release bump wrapper. By default, a bump writes version metadata
only. Release tags are created by the GitHub release-tag workflow from a
production branch.

Common options:
  --dry-run          Show planned edits and git actions without changing files.
  --no-commit       Write files but do not commit. This is the default.
  --commit          Commit the bump.
  --amend           Amend the current commit instead of creating a new commit.
  -m, --message MSG Pass a commit message to git commit. May be repeated.
  --no-edit         Reuse the current commit message with --amend.
  --no-verify       Pass --no-verify to git commit.
  --signoff         Pass --signoff to git commit.
  --no-tag          Do not create a local tag. This is the default.
  --tag             Create a local tag after committing. Manual fallback only.
  --force-tag       Move an existing local release tag to HEAD.

All other options are passed through to bump-version.py.
EOF
}

commit=0
tag=0
dry_run=0
check_mode=0
args=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --dry-run)
      dry_run=1
      args+=("$1")
      ;;
    --check)
      check_mode=1
      args+=("$1")
      ;;
    --check-incremented-from)
      check_mode=1
      args+=("$1")
      if [ "$#" -lt 2 ]; then
        echo "--check-incremented-from requires a ref" >&2
        exit 2
      fi
      shift
      args+=("$1")
      ;;
    --check-incremented-from=*)
      check_mode=1
      args+=("$1")
      ;;
    --no-commit)
      commit=0
      tag=0
      ;;
    --commit)
      commit=1
      ;;
    --amend)
      commit=0
      tag=1
      args+=("$1")
      ;;
    --no-tag)
      tag=0
      ;;
    --tag)
      tag=1
      ;;
    *)
      args+=("$1")
      ;;
  esac
  shift
done

if [ "$check_mode" -eq 0 ]; then
  if [ "$commit" -eq 1 ]; then
    args+=("--commit")
  fi
  if [ "$tag" -eq 1 ] && { [ "$commit" -eq 1 ] || printf '%s\n' "${args[@]}" | grep -qx -- '--amend'; }; then
    args+=("--tag")
  fi
fi

exec "$PYTHON_BIN" "$SCRIPT_DIR/bump-version.py" "${args[@]}"
