# Commit Workflow

Use this file before committing, rebasing, resolving generated-file conflicts,
or bumping release versions.

## Before Committing

1. Check your branch and worktree:

   ```bash
   git branch --show-current
   git status --short
   ```

2. If the branch will open or update a PR, fetch the latest base branch before
   the final version bump:

   ```bash
   git fetch origin dev main --tags
   git show origin/dev:plugins/cad/VERSION
   ```

   Rebase or merge the target base before bumping release metadata when the base
   branch has advanced. Resolve source files first, regenerate generated
   outputs, then run the version bump wrapper.

3. Confirm every changed file belongs to the current task. Do not revert or
   include unrelated user changes. Prefer path-targeted staging; use
   `git add -A` only after reviewing the full status and confirming all
   additions, deletions, and generated renames belong in the commit.

4. Edit sources first, then regenerate generated outputs. Common source to
   generated-output paths:

   - `packages/cadjs` or `viewer`: run `scripts/build/build-viewer.sh`, and for
     packaged Viewer changes run `scripts/build/build-cad-viewer-skill.sh`.
   - `skills/cad-viewer/scripts/viewer/dist`: generated from `viewer/dist`; do
     not hand-edit minified chunks or sourcemaps.
   - `skills/cad-viewer/scripts/viewer/packages/*`: generated from
     `viewer/packages/*`, which are generated from root `packages/*`.
   - `skills/cad/scripts/packages/*` and `skills/{urdf,srdf,sdf}/scripts/packages/*`:
     generated from root `packages/*`.
   - `plugins/cad/skills/*`: generated from root `skills/*`; run
     `scripts/build/build-plugin.sh` after changing skill runtimes.

5. Run the smallest checks that cover the change. Useful defaults:

   ```bash
   git diff --check
   scripts/build/build-viewer.sh --check
   scripts/build/build-cad-viewer-skill.sh --check
   scripts/build/build-plugin.sh --check
   scripts/check/validate-plugins.sh
   scripts/check-version.sh
   ```

   Broaden to `scripts/build.sh --check` or `scripts/test.sh` when touching
   shared package behavior, multiple skills, CI, release tooling, or generated
   runtime contracts.

6. Commit only after generated copies are fresh and checks have passed or their
   failures are understood and reported. If a hook updates or rejects files,
   inspect `git status --short`, regenerate/check as needed, then amend or
   recommit intentionally.

## Generated-File Conflicts

Generated files are noisy during rebase and merge conflicts. Resolve the source
of truth first, then regenerate rather than manually merging generated blobs.

1. List conflicts:

   ```bash
   git diff --name-only --diff-filter=U
   ```

2. For source files, resolve the real semantic conflict manually.

3. For generated files, avoid editing conflict markers inside bundled runtime
   code, minified `dist/assets/*`, sourcemaps, package copies, or plugin copies.
   Pick the source-side result that matches the intended source state, then run
   the appropriate build script. Common examples:

   - CAD Viewer hashed assets or sourcemaps:

     ```bash
     scripts/build/build-cad-viewer-skill.sh
     scripts/build/build-cad-viewer-skill.sh --check
     ```

   - Plugin package copies:

     ```bash
     scripts/build/build-plugin.sh
     scripts/build/build-plugin.sh --check
     scripts/check/validate-plugins.sh
     ```

   - Viewer-local `packages/*` copies:

     ```bash
     scripts/build/build-viewer.sh
     scripts/build/build-viewer.sh --check
     ```

4. If the conflict is only a release-version conflict, keep the version that is
   greater than the target `main` commit, or rerun the bump script after the
   rebase. Then verify:

   ```bash
   scripts/check-version.sh
   scripts/check-version.sh --incremented-from origin/main
   ```

5. Stage resolved files, finish the rebase or merge, and rerun the relevant
   freshness checks. Never disable Git LFS filters for staging or committing.

## Version Bumps

Release versions are intentionally lockstep across the git tag, plugin
manifests, `plugins/*/VERSION`, package manifests and locks, Python
`pyproject.toml` files, generated skill runtimes, plugin package copies, and
repo-owned docs. CI checks that all versions match and that the branch version
is greater than the target base commit.

For development branches, use the wrapper without creating a local tag:

```bash
scripts/release/bump-version.sh patch --dry-run
scripts/release/bump-version.sh patch --no-commit
```

That updates every repo-owned version target. Commit those edits with the PR
work. CI checks them with `scripts/check-version.sh`.

Useful variants:

```bash
scripts/release/bump-version.sh patch --amend
scripts/release/bump-version.sh patch --no-commit
scripts/release/bump-version.sh --set-version 0.2.0 --no-commit
scripts/check-version.sh
scripts/check-version.sh --incremented-from origin/main
```

Use `--amend` when the version bump belongs in the current commit. Use
`--no-commit` when you need to combine the bump with other staged work or when
resolving a rebase conflict manually. Create and push release tags only from a
materialized release branch when the user or release workflow explicitly asks
for tags to be published.
