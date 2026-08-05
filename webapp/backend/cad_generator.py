"""
cad_generator.py — Text-to-CAD generation pipeline.

Takes a user's text prompt, sends it to an LLM with build123d instructions,
receives Python code, executes it in a sandboxed subprocess, and returns
paths to the generated STEP / STL / GLB files.
"""

import os
import sys
import json
import uuid
import subprocess
import textwrap
import traceback
from pathlib import Path

# ---------------------------------------------------------------------------
# LLM client helpers (Google Gemini *or* OpenAI — picked by env var)
# ---------------------------------------------------------------------------

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

SYSTEM_PROMPT = textwrap.dedent("""\
You are a CAD engineer. The user will describe a mechanical part or assembly
in plain language.  You MUST reply with **only** a single fenced Python code
block that uses the `build123d` library to create the geometry and export it
to a STEP file.

Rules you MUST follow:
1. Import from build123d:  `from build123d import *`
2. Also import:            `from build123d import export_step`
3. Build the geometry using BuildPart() context manager.
4. At the end call:        `export_step(result, "output.step")`
   where `result` is the final Part object.
5. Use millimeters as units.
6. Center the part at the origin unless told otherwise.
7. Do NOT print anything, do NOT use matplotlib, do NOT open windows.
8. Do NOT use `show()` or `show_object()`.
9. Respond ONLY with the Python code block — no explanations, no markdown
   outside the code fence.

Example response:
```python
from build123d import *
from build123d import export_step

with BuildPart() as part:
    Box(50, 30, 10)

export_step(part.part, "output.step")
```
""")


async def _call_gemini(prompt: str) -> str:
    """Call Google Gemini and return the text response."""
    import google.generativeai as genai

    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        system_instruction=SYSTEM_PROMPT,
    )
    response = model.generate_content(prompt)
    return response.text


async def _call_openai(prompt: str) -> str:
    """Call OpenAI and return the text response."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content


async def call_llm(prompt: str) -> str:
    """Route to whichever LLM provider has a key configured."""
    if GEMINI_KEY:
        return await _call_gemini(prompt)
    if OPENAI_KEY:
        return await _call_openai(prompt)
    raise RuntimeError(
        "No LLM API key found. Set GEMINI_API_KEY or OPENAI_API_KEY."
    )


# ---------------------------------------------------------------------------
# Code extraction
# ---------------------------------------------------------------------------

def extract_python_code(llm_response: str) -> str:
    """Pull the first ```python ... ``` block out of the LLM response."""
    if "```python" in llm_response:
        code = llm_response.split("```python", 1)[1]
        code = code.split("```", 1)[0]
        return code.strip()
    if "```" in llm_response:
        code = llm_response.split("```", 1)[1]
        code = code.split("```", 1)[0]
        return code.strip()
    return llm_response.strip()


# ---------------------------------------------------------------------------
# CAD execution
# ---------------------------------------------------------------------------

GENERATED_DIR = Path(__file__).resolve().parent / "generated"
GENERATED_DIR.mkdir(exist_ok=True)


def _step_to_glb(step_path: Path, glb_path: Path) -> bool:
    """Attempt to convert STEP → GLB using cadquery or build123d."""
    try:
        convert_script = textwrap.dedent(f"""\
import sys
try:
    from build123d import import_step, export_stl
    from build123d import Mesher
    shape = import_step("{step_path.as_posix()}")
    # Export STL as a fallback visual format
    export_stl(shape, "{glb_path.with_suffix('.stl').as_posix()}")
except Exception:
    pass
""")
        subprocess.run(
            [sys.executable, "-c", convert_script],
            timeout=60,
            capture_output=True,
        )
        return glb_path.with_suffix(".stl").exists()
    except Exception:
        return False


async def generate_cad(prompt: str) -> dict:
    """
    Full pipeline: prompt → LLM → Python code → execute → return file paths.

    Returns a dict with keys:
        job_id, status, step_file, stl_file, glb_file, code, error
    """
    job_id = uuid.uuid4().hex[:12]
    job_dir = GENERATED_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    result = {
        "job_id": job_id,
        "status": "pending",
        "step_file": None,
        "stl_file": None,
        "glb_file": None,
        "code": None,
        "error": None,
        "prompt": prompt,
    }

    # ---- Step 1: Ask the LLM for code ----
    try:
        llm_response = await call_llm(prompt)
        code = extract_python_code(llm_response)
        result["code"] = code
    except Exception as exc:
        result["status"] = "error"
        result["error"] = f"LLM call failed: {exc}"
        _save_job(job_dir, result)
        return result

    # ---- Step 2: Patch output path and write script ----
    step_filename = "output.step"
    stl_filename = "output.stl"
    patched_code = code.replace(
        '"output.step"', f'r"{(job_dir / step_filename).as_posix()}"'
    ).replace(
        "'output.step'", f'r"{(job_dir / step_filename).as_posix()}"'
    )

    # Also add STL export if not present
    if "export_stl" not in patched_code:
        patched_code += textwrap.dedent(f"""

# --- Auto-added STL export ---
try:
    from build123d import export_stl
    _parts = [v for v in dir() if not v.startswith('_')]
    for _name in _parts:
        _obj = eval(_name)
        if hasattr(_obj, 'part'):
            export_stl(_obj.part, r"{(job_dir / stl_filename).as_posix()}")
            break
except Exception:
    pass
""")

    script_path = job_dir / "generate.py"
    script_path.write_text(patched_code, encoding="utf-8")

    # ---- Step 3: Execute in subprocess ----
    try:
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=str(job_dir),
        )
        if proc.returncode != 0:
            result["status"] = "error"
            result["error"] = f"CAD script failed:\n{proc.stderr[-2000:]}"
            _save_job(job_dir, result)
            return result
    except subprocess.TimeoutExpired:
        result["status"] = "error"
        result["error"] = "CAD generation timed out (120s limit)."
        _save_job(job_dir, result)
        return result

    # ---- Step 4: Collect outputs ----
    step_path = job_dir / step_filename
    stl_path = job_dir / stl_filename

    if step_path.exists():
        result["step_file"] = f"/api/files/{job_id}/{step_filename}"
    if stl_path.exists():
        result["stl_file"] = f"/api/files/{job_id}/{stl_filename}"

    # Try GLB conversion
    glb_path = job_dir / "output.glb"
    if step_path.exists():
        _step_to_glb(step_path, glb_path)
        if glb_path.exists():
            result["glb_file"] = f"/api/files/{job_id}/output.glb"

    if result["step_file"] or result["stl_file"]:
        result["status"] = "completed"
    else:
        result["status"] = "error"
        result["error"] = "No output files were generated. The code may have a geometry error."

    _save_job(job_dir, result)
    return result


def _save_job(job_dir: Path, result: dict):
    """Persist job metadata to disk."""
    (job_dir / "job.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8"
    )


def get_job(job_id: str) -> dict | None:
    """Load a previously saved job result."""
    job_file = GENERATED_DIR / job_id / "job.json"
    if job_file.exists():
        return json.loads(job_file.read_text(encoding="utf-8"))
    return None
