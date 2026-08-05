"""
Vercel serverless function entry point for the Text-to-CAD API.

Wraps the FastAPI app for Vercel's Python runtime.
"""

import os
import sys
import json
import uuid
import textwrap
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from mangum import Mangum

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Text-to-CAD API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# LLM config
# ---------------------------------------------------------------------------
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

SYSTEM_PROMPT = textwrap.dedent("""\
You are a CAD engineer. The user will describe a mechanical part or assembly
in plain language. You MUST reply with **only** a single fenced Python code
block that uses the `build123d` library to create the geometry and export it
to a STEP file.

Rules:
1. Import from build123d: `from build123d import *`
2. Also import: `from build123d import export_step`
3. Build geometry using BuildPart() context manager.
4. At the end call: `export_step(result, "output.step")`
5. Use millimeters. Center at origin.
6. Do NOT print, use matplotlib, or open windows.
7. Respond ONLY with the Python code block.

Example:
```python
from build123d import *
from build123d import export_step

with BuildPart() as part:
    Box(50, 30, 10)

export_step(part.part, "output.step")
```
""")


# ---------------------------------------------------------------------------
# LLM callers
# ---------------------------------------------------------------------------
async def call_gemini(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash", system_instruction=SYSTEM_PROMPT)
    response = model.generate_content(prompt)
    return response.text


async def call_openai(prompt: str) -> str:
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
    if GEMINI_KEY:
        return await call_gemini(prompt)
    if OPENAI_KEY:
        return await call_openai(prompt)
    raise RuntimeError("No LLM API key. Set GEMINI_API_KEY or OPENAI_API_KEY in Vercel env vars.")


def extract_python_code(llm_response: str) -> str:
    if "```python" in llm_response:
        code = llm_response.split("```python", 1)[1]
        return code.split("```", 1)[0].strip()
    if "```" in llm_response:
        code = llm_response.split("```", 1)[1]
        return code.split("```", 1)[0].strip()
    return llm_response.strip()


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    prompt: str


class GenerateResponse(BaseModel):
    job_id: str
    status: str
    code: str | None = None
    error: str | None = None
    prompt: str | None = None
    message: str | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.post("/api/generate", response_model=GenerateResponse)
async def api_generate(req: GenerateRequest):
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    job_id = uuid.uuid4().hex[:12]

    try:
        llm_response = await call_llm(req.prompt.strip())
        code = extract_python_code(llm_response)

        return GenerateResponse(
            job_id=job_id,
            status="completed",
            code=code,
            prompt=req.prompt.strip(),
            message="Code generated! Copy the code and run it locally with build123d to produce STEP/STL files. "
                    "Serverless environments cannot run CAD compilation — use your local machine or a GPU server.",
        )
    except Exception as exc:
        return GenerateResponse(
            job_id=job_id,
            status="error",
            error=str(exc),
            prompt=req.prompt.strip(),
        )


@app.get("/api/health")
async def api_health():
    has_gemini = bool(GEMINI_KEY)
    has_openai = bool(OPENAI_KEY)
    return {
        "status": "ok",
        "llm_configured": has_gemini or has_openai,
        "llm_provider": "gemini" if has_gemini else ("openai" if has_openai else "none"),
    }


# ---------------------------------------------------------------------------
# Mangum handler for Vercel
# ---------------------------------------------------------------------------
handler = Mangum(app, lifespan="off")
