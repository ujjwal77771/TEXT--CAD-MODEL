"""
main.py — FastAPI server for the Text-to-CAD web platform.

Serves the frontend, accepts generation requests, and streams back results.
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from cad_generator import generate_cad, get_job, GENERATED_DIR


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    GENERATED_DIR.mkdir(exist_ok=True)
    yield


app = FastAPI(
    title="Text-to-CAD Platform",
    description="Generate CAD models from natural language prompts.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    prompt: str


class GenerateResponse(BaseModel):
    job_id: str
    status: str
    step_file: str | None = None
    stl_file: str | None = None
    glb_file: str | None = None
    code: str | None = None
    error: str | None = None
    prompt: str | None = None


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.post("/api/generate", response_model=GenerateResponse)
async def api_generate(req: GenerateRequest):
    """Accept a text prompt, generate CAD, return results."""
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")
    if len(req.prompt) > 5000:
        raise HTTPException(status_code=400, detail="Prompt too long (max 5000 chars).")

    result = await generate_cad(req.prompt.strip())
    return GenerateResponse(**result)


@app.get("/api/job/{job_id}", response_model=GenerateResponse)
async def api_get_job(job_id: str):
    """Retrieve a previously generated job."""
    result = get_job(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return GenerateResponse(**result)


@app.get("/api/files/{job_id}/{filename}")
async def api_get_file(job_id: str, filename: str):
    """Serve a generated file (STEP, STL, GLB)."""
    # Sanitize
    if ".." in job_id or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid path.")

    file_path = GENERATED_DIR / job_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    media_types = {
        ".step": "application/step",
        ".stp": "application/step",
        ".stl": "application/sla",
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".py": "text/x-python",
        ".json": "application/json",
    }
    content_type = media_types.get(file_path.suffix.lower(), "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=filename,
    )


@app.get("/api/health")
async def api_health():
    """Health check endpoint."""
    has_gemini = bool(os.getenv("GEMINI_API_KEY", ""))
    has_openai = bool(os.getenv("OPENAI_API_KEY", ""))
    return {
        "status": "ok",
        "llm_configured": has_gemini or has_openai,
        "llm_provider": "gemini" if has_gemini else ("openai" if has_openai else "none"),
    }


# ---------------------------------------------------------------------------
# Serve frontend
# ---------------------------------------------------------------------------

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

# Mount static assets
if (FRONTEND_DIR / "css").exists():
    app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
if (FRONTEND_DIR / "js").exists():
    app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
if (FRONTEND_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    """Serve the frontend index.html."""
    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        return HTMLResponse("<h1>Frontend not found</h1>", status_code=500)
    return HTMLResponse(index_path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Run with:  python main.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
