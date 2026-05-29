# Scripts

Use the top-level `scripts/` wrappers for normal work:

| Task | Command |
| ---- | ------- |
| Set up dev symlinks | `scripts/dev.sh` |
| Check dev symlinks | `scripts/dev.sh --check` |
| Build production outputs | `scripts/build.sh --clean` |
| Check production outputs are fresh | `scripts/build.sh --check` |
| Run code tests | `scripts/test.sh` |
| Check release metadata | `scripts/check-version.sh` |
| Install local skills into agents | `scripts/install.sh --agent codex` |
| Uninstall local skill links | `scripts/uninstall.sh --agent codex` |

Lower-level scripts stay grouped by ownership:

- `build/`: individual production build scripts for viewer packages, skill
  runtimes, and plugin skill copies.
- `check/`: code, build, plugin, and layout checks used by wrappers and CI.
- `dev/`: symlink layout setup plus install/uninstall implementations.
- `release/`: version bumping, release commits, tags, and GitHub Releases.
- `catalog/`, `viewer/`, `git-hooks/`: specialized repo tooling.

## Build

`scripts/build.sh` is the master production build script. It forwards to
`scripts/build/build-skills.sh`, which runs the individual build scripts:

```text
scripts/build/build-urdf-skill.sh
scripts/build/build-srdf-skill.sh
scripts/build/build-sdf-skill.sh
scripts/build/build-cad-skill.sh
scripts/build/build-cad-viewer-skill.sh
scripts/build/build-plugin.sh
```

Use:

```bash
scripts/build.sh --clean
scripts/build.sh --check
```

`scripts/check/check-builds.sh` is the release-layout gate. It verifies
there are no symlinks under production runtime paths, then runs
`scripts/check-version.sh`, `scripts/build.sh --check`, and plugin validation.

## Dev

`scripts/dev.sh` is the master development-layout script:

```bash
scripts/dev.sh
scripts/dev.sh --check
```

It links generated-copy targets back to their canonical source directories and
checks that those symlinks are present.

## Install

Use the install wrappers for local agent links:

```bash
scripts/install.sh --agent codex
scripts/uninstall.sh --agent codex
```

They delegate to the implementation scripts under `scripts/dev/`.

## Version And Release

Use `scripts/check-version.sh` for CI/read-only checks:

```bash
scripts/check-version.sh
scripts/check-version.sh --incremented-from origin/main
```

Use `scripts/release/bump-version.sh` for development branch release metadata
bumps:

```bash
scripts/release/bump-version.sh patch --dry-run
scripts/release/bump-version.sh patch --no-commit
```

Use `scripts/release/create-github-release.sh` only when preparing an actual
tag/GitHub Release from a production release branch.

## CI

- `test.yml`: runs code tests on `dev`, `build-test`, `main`, and PRs.
- `check-version.yml`: checks release metadata on `dev`, `build-test`, `main`,
  and PRs.
- `check-builds.yml`: checks production build freshness on `build-test` and
  `main`.
- `build-test-branch.yml`: temporary release builder from `dev` to
  `build-test`; this will target `main` once the flow is trusted.
