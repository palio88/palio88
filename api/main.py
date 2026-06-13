import os
import uuid
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="FormForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CAD_WORKER_URL = os.environ.get("CAD_WORKER_URL", "http://cad-worker:8001")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


# ─── Auth helper ──────────────────────────────────────────────────────────────

async def get_user(authorization: str = Header(...)) -> dict:
    token = authorization.removeprefix("Bearer ").strip()
    try:
        resp = supabase.auth.get_user(token)
        return {"id": resp.user.id, "email": resp.user.email}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_optional_user(authorization: str = Header(default="")) -> dict | None:
    if not authorization:
        return None
    try:
        return await get_user(authorization)
    except HTTPException:
        return None


# ─── Templates ────────────────────────────────────────────────────────────────

@app.get("/templates")
async def list_templates():
    import json
    templates_json = Path(__file__).parent.parent / "formforge-app" / "data" / "templates.json"
    if templates_json.exists():
        return json.loads(templates_json.read_text())
    raise HTTPException(status_code=500, detail="Template registry not found")


@app.get("/templates/{template_id}/code")
async def get_template_code(template_id: str):
    safe_id = template_id.replace("/", "").replace("..", "")
    code_path = TEMPLATES_DIR / f"template_{safe_id}.py"
    if not code_path.exists():
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
    return {"template_id": template_id, "code": code_path.read_text()}


# ─── Parametric generation (fast lane, proxies to CAD worker) ─────────────────

class ParametricRequest(BaseModel):
    template_id: str
    params: dict[str, Any]


@app.post("/parametric")
async def generate_parametric(
    request: ParametricRequest,
    user: dict | None = Depends(get_optional_user),
):
    template_code_resp = await get_template_code(request.template_id)
    template_code = template_code_resp["code"]

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(
                f"{CAD_WORKER_URL}/parametric",
                json={
                    "template_id": request.template_id,
                    "template_code": template_code,
                    "params": request.params,
                },
            )
            resp.raise_for_status()
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="CAD worker timeout")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"CAD worker error: {e.response.text[:500]}")

    return resp.json()


# ─── Async generation (AI lane) ───────────────────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str


@app.post("/generate")
async def enqueue_generation(
    request: GenerateRequest,
    user: dict = Depends(get_user),
):
    # Moderate prompt before queuing
    if OPENAI_API_KEY:
        flagged = await moderate_prompt(request.prompt)
        if flagged:
            raise HTTPException(status_code=422, detail="Prompt flagged by content moderation")

    job_id = str(uuid.uuid4())
    supabase.table("generation_jobs").insert({
        "id": job_id,
        "user_id": user["id"],
        "prompt": request.prompt,
        "status": "queued",
    }).execute()

    return {"job_id": job_id, "status": "queued"}


@app.get("/job/{job_id}")
async def get_job_status(job_id: str, user: dict = Depends(get_user)):
    resp = (
        supabase.table("generation_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return resp.data


async def moderate_prompt(prompt: str) -> bool:
    """Returns True if prompt is flagged."""
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        result = await client.moderations.create(input=prompt)
        return result.results[0].flagged
    except Exception:
        return False


# ─── Designs ──────────────────────────────────────────────────────────────────

class SaveDesignRequest(BaseModel):
    template_id: str
    template_name: str
    params: dict[str, Any]
    stl_url: str | None = None
    glb_url: str | None = None


@app.get("/designs")
async def list_designs(user: dict = Depends(get_user)):
    resp = (
        supabase.table("designs")
        .select("*")
        .eq("user_id", user["id"])
        .order("updated_at", desc=True)
        .execute()
    )
    return resp.data or []


@app.post("/designs")
async def save_design(request: SaveDesignRequest, user: dict = Depends(get_user)):
    record = {
        "user_id": user["id"],
        "template_id": request.template_id,
        "template_name": request.template_name,
        "params": request.params,
        "stl_url": request.stl_url,
        "glb_url": request.glb_url,
    }
    resp = supabase.table("designs").insert(record).execute()
    return resp.data[0]


@app.delete("/designs/{design_id}")
async def delete_design(design_id: str, user: dict = Depends(get_user)):
    supabase.table("designs").delete().eq("id", design_id).eq("user_id", user["id"]).execute()
    return {"deleted": design_id}


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "formforge-api"}
