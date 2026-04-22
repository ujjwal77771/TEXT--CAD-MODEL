# CAD Harness

This repository is a general-purpose harness for script-driven CAD work. It gives
you a place for project geometry under `models/`, reusable generation and
inspection tools under `skills/`, and an optional browser viewer under `viewer/`.

The root README is intentionally project-neutral. Put durable details about the
current CAD project in `models/README.md`, and put viewer implementation details
in `viewer/README.md`.

## What This Repo Provides

- A project workspace for CAD sources, imported CAD files, generated outputs, and
  project-local notes under `models/`.
- A CAD skill with explicit file-targeted tools for STEP, STL, DXF, GLB,
  topology, prompt references, and review snapshots.
- A URDF skill with explicit file-targeted tools for generated robot
  descriptions and mesh references.
- A CAD Explorer viewer for browsing generated CAD artifacts and copying stable
  `@cad[...]` references.
- Repo-level conventions for agents and humans so generated files stay
  reproducible.

## Where To Start

- Agent instructions: [AGENTS.md](AGENTS.md)
- Project-local model notes: [models/README.md](models/README.md)
- CAD workflows: [skills/cad/SKILL.md](skills/cad/SKILL.md)
- URDF workflows: [skills/urdf/SKILL.md](skills/urdf/SKILL.md)
- Viewer workflows: [viewer/README.md](viewer/README.md)

## Mental Model

The harness owns the repository shape. The skills own the workflows.

- Keep project CAD files under `models/`.
- Treat generated CAD, URDF, render, topology, and review artifacts as derived
  outputs.
- Edit source generators, shared source modules, or imported CAD inputs first.
- Regenerate explicit targets with the relevant skill tool.
- Use `models/README.md` for project inventory, rebuild roots, dependencies, and
  durable quirks. Avoid copying reusable skill documentation into project notes.

The skill tools are portable. They operate on explicit file paths and do not
require every project to use the same internal `models/` layout.

## Repository Layout

- `AGENTS.md`: Harness policies and skill routing for coding agents.
- `README.md`: This repo-level overview.
- `requirements-cad.txt`: Minimal Python dependencies for the bundled CAD and
  URDF tools.
- `models/`: The project CAD workspace. Organize it to fit the project, and keep
  project-local notes in `models/README.md`.
- `skills/cad/`: CAD generation, inspection, prompt-reference, validation, and
  snapshot tooling.
- `skills/urdf/`: URDF generation and validation tooling.
- `viewer/`: CAD Explorer, a Vite/React app for browsing generated artifacts.

## Python Setup

Use the repo-local virtual environment for CAD and URDF tools. If `.venv`
already exists, prefer invoking its Python directly:

```bash
./.venv/bin/python
```

If `.venv` is missing or cannot import the CAD runtime modules, create it from
the repository root:

```bash
python3.11 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/pip install -r requirements-cad.txt
./.venv/bin/python -c "import build123d, OCP"
```

`requirements-cad.txt` currently includes the runtime dependencies used by the
bundled CAD and URDF tools: `build123d`, `ezdxf`, `numpy`, and `trimesh`.

Viewer dependencies are separate:

```bash
cd viewer
npm install
```

## Common Generation Commands

Run these from the repository root unless you intentionally want paths to resolve
from another directory.

```bash
# Regenerate a CAD part source.
./.venv/bin/python skills/cad/scripts/gen_step_part models/path/to/part.py

# Regenerate a CAD assembly source.
./.venv/bin/python skills/cad/scripts/gen_step_assembly models/path/to/assembly.py

# Regenerate a DXF sidecar.
./.venv/bin/python skills/cad/scripts/gen_dxf models/path/to/source.py

# Regenerate a URDF sidecar.
./.venv/bin/python skills/urdf/scripts/gen_urdf models/path/to/source.py
```

Generation is intentionally explicit. The tools do not run directory-wide
generation, and changing output paths may leave old generated files behind.

## Inspect And Review

Resolve a copied viewer prompt reference:

```bash
./.venv/bin/python skills/cad/scripts/cadref inspect '@cad[models/path/to/entry]' --json
```

Inspect major planes or topology groups:

```bash
./.venv/bin/python skills/cad/scripts/cadref planes models/path/to/entry --json
```

Render a temporary review image:

```bash
./.venv/bin/python skills/cad/scripts/snapshot models/path/to/source.py \
  --view isometric --out /tmp/cad-renders/review.png
```

Use `cadref` and numeric checks for exact geometry questions. Use `snapshot`
when a quick image is the clearest review artifact. Keep temporary review images
outside `models/`.

## Viewer

Start the CAD Explorer from `viewer/`:

```bash
cd viewer
npm run dev
```

Then open [http://localhost:4178](http://localhost:4178).

The viewer scans a CAD directory, defaulting to `models`, and reads generated
artifacts from that tree. It is read-only with respect to CAD source files. For
viewer behavior, development, persistence, and verification details, see
[viewer/README.md](viewer/README.md).

## Working Rules

- Prefer the narrowest source-only search that identifies affected files.
- Do not hand-edit generated artifacts unless explicitly instructed.
- Regenerate only explicit targets.
- Let the CAD and URDF skill tools own viewer-consumed generated assets.
- Keep project-specific documentation compact and local to `models/README.md`.
- Keep temporary files, especially review renders, under `/tmp/...`.

## Git LFS

CAD exchange files and generated CAD artifacts may be managed by Git LFS. Install
Git LFS normally:

```bash
git lfs install
```

The repository `.gitattributes` file defines the exact tracked patterns.
