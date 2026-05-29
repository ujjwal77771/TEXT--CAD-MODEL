# Scripts

Use these durable entrypoints for normal work:

| Task | Command |
| ---- | ------- |
| Set up dev symlinks | `scripts/dev/setup-symlinks.sh` |
| Check dev symlinks | `scripts/dev/setup-symlinks.sh --check` |
| Bundle production outputs | `scripts/bundle/bundle.sh --clean` |
| Check production outputs are fresh | `scripts/bundle/bundle.sh --check` |
| Bundle one skill output | `scripts/bundle/bundle-skill.sh <skill-id>` |
| Run code tests | `scripts/test/test.sh` |
| Check release metadata | `scripts/release/check-version.sh` |
| Install local skills into agents | `scripts/install/install-skills.sh --agent codex` |
| Uninstall local skill links | `scripts/install/uninstall-skills.sh --agent codex` |

Lower-level scripts stay grouped by ownership:

- `bundle/`: production bundle wrapper, skill bundle router, skill runtime
  bundlers, and plugin package bundle/check scripts.
- `test/`: code test runner and targeted test subcommands.
- `github-workflows/`: release-layout and development-layout check entrypoints
  used by GitHub Actions.
- `dev/`: symlink layout setup and verification for development checkouts.
- `install/`: local skill install/uninstall scripts for agent skill folders.
- `utils/`: shared helper scripts used by durable repo commands.
- `release/`: version bumping, release commits, tags, and GitHub Releases.
- `viewer/`, `git-hooks/`: specialized repo tooling.

Root `tests/` contains repo-wide policy tests that are not owned by one package,
skill, or app runtime.

## Bundle

`scripts/bundle/bundle.sh` is the master production bundle script. It runs every
bundle-capable skill through the skill bundle router and then refreshes the plugin
package copy:

```text
scripts/bundle/bundle-skill.sh --all
scripts/bundle/bundle-plugin.sh
```

Use:

```bash
scripts/bundle/bundle.sh --clean
scripts/bundle/bundle.sh --check
scripts/bundle/bundle-skill.sh <skill-id> --check
```

`scripts/github-workflows/check-builds.sh` is the release-layout gate. It verifies
there are no symlinks under production runtime paths, then runs
`scripts/release/check-version.sh` and `scripts/bundle/bundle.sh --check`. Plugin skill-copy
freshness and plugin metadata validation are part of
`scripts/bundle/bundle-plugin.sh --check`, which runs through the master bundle
check.

## Dev

`scripts/dev/setup-symlinks.sh` is the master development-layout script:

```bash
scripts/dev/setup-symlinks.sh
scripts/dev/setup-symlinks.sh --check
```

It links generated-copy targets back to their canonical source directories and
checks that those symlinks are present.

## Install

Use the install scripts for local agent links:

```bash
scripts/install/install-skills.sh --agent codex
scripts/install/uninstall-skills.sh --agent codex
```

They install or remove local development skill symlinks in agent-specific skill
directories.

## Test

`scripts/test/test.sh` is the broad code test runner. It delegates to focused
subcommands that can be run directly for smaller checks:

```bash
scripts/test/test-js.sh
scripts/test/test-docs.sh
scripts/test/test-python.sh
scripts/test/test-global.sh
```

## Version And Release

Use `scripts/release/check-version.sh` for CI/read-only checks:

```bash
scripts/release/check-version.sh
scripts/release/check-version.sh --incremented-from origin/main
```

Normal development branches should not bump release metadata. Use the `Prepare
Release` GitHub Actions workflow to open a release PR from `dev`; use
`scripts/release/bump-version.sh` only as a local fallback for that release PR:

```bash
scripts/release/bump-version.sh patch --dry-run
scripts/release/bump-version.sh patch --no-commit
```

Use `scripts/release/publish-github-release.sh` only from a production branch or
the `Release Tag` workflow. It creates the semver git tag from
`plugins/cad/VERSION` and creates a draft GitHub Release with generated notes.
`scripts/release/create-github-release.sh` remains as a manual all-in-one
fallback, but the workflow path is preferred.

## CI

- `test.yml`: runs code tests on `dev`, `build-test`, `main`, and PRs.
- `check-version.yml`: checks release metadata on `dev`, `build-test`, `main`,
  and PRs.
- `check-builds.yml`: checks production bundle freshness on `build-test` and
  `main`.
- `check-symlinks.yml`: checks the development symlink layout on `dev` and PRs
  targeting `dev`.
- `prepare-release.yml`: manually opens a release metadata PR against `dev`.
- `build-test-branch.yml`: temporary release builder from `dev` to
  `build-test`; this will target `main` once the flow is trusted.
- `release-tag.yml`: temporary production tag/release workflow for `build-test`;
  this will target `main` once the flow is trusted.
