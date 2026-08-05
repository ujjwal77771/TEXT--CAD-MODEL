# Text-to-CAD Web Platform

A web application that lets **any user** generate production-ready CAD models
(STEP, STL) from plain text descriptions — no installation or CAD knowledge
required.

## Architecture

```
webapp/
├── backend/
│   ├── main.py              # FastAPI server (API + static file serving)
│   ├── cad_generator.py     # LLM → build123d → STEP/STL pipeline
│   ├── requirements.txt     # Python dependencies
│   └── generated/           # Auto-created: holds generated job outputs
└── frontend/
    ├── index.html            # Main page
    ├── css/style.css         # Dark glassmorphic theme
    └── js/
        ├── app.js            # Prompt submission & result rendering
        └── viewer.js         # Three.js 3D viewer for STL preview
```

## Quick Start

### 1. Install Python dependencies

```bash
cd webapp/backend
pip install -r requirements.txt
```

> **Note:** `build123d` requires a working OpenCASCADE installation. On most
> systems `pip install build123d` handles this automatically. If you encounter
> issues, see the [build123d installation guide](https://build123d.readthedocs.io/).

### 2. Set your LLM API key

The platform needs an LLM to convert text → Python CAD code. Set **one** of:

```bash
# Google Gemini (recommended — fast and cost-effective)
set GEMINI_API_KEY=your-gemini-api-key-here

# OR OpenAI
set OPENAI_API_KEY=your-openai-api-key-here
```

> Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/apikey)

### 3. Run the server

```bash
cd webapp/backend
python main.py
```

The server starts at **http://localhost:8000**. Open it in your browser!

### 4. Use it

1. Type a description like *"Create a 50mm hex nut with M8 threading"*
2. Click **Generate CAD**
3. View the 3D preview, download STEP/STL files

## How It Works

```
User types prompt
       ↓
  FastAPI backend receives prompt
       ↓
  LLM (Gemini/GPT-4) generates build123d Python code
       ↓
  Python subprocess executes the code
       ↓
  STEP + STL files are saved to /generated/{job_id}/
       ↓
  Frontend renders 3D preview via Three.js
  and provides download links
```

## Supported LLM Providers

| Provider        | Env Variable      | Model Used          |
| --------------- | ----------------- | ------------------- |
| Google Gemini   | `GEMINI_API_KEY`  | gemini-2.0-flash    |
| OpenAI          | `OPENAI_API_KEY`  | gpt-4o              |

## API Endpoints

| Method | Endpoint                        | Description                      |
| ------ | ------------------------------- | -------------------------------- |
| POST   | `/api/generate`                 | Submit a text prompt             |
| GET    | `/api/job/{job_id}`             | Retrieve a past generation       |
| GET    | `/api/files/{job_id}/{filename}`| Download generated files          |
| GET    | `/api/health`                   | Server & LLM status check        |
| GET    | `/`                             | Serve the web frontend           |

## Security Notes

- The backend executes LLM-generated Python code in a subprocess. For
  production deployment, wrap execution in a container sandbox (e.g., gVisor,
  Firecracker, or isolated Docker).
- Rate-limit the `/api/generate` endpoint to prevent abuse.
- Never expose this to the public internet without authentication and sandboxing.

## License

MIT — see the root repository [LICENSE](../LICENSE).
