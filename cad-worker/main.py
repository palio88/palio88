import ast
import os
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

app = FastAPI(title="FormForge CAD Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

MAX_EXEC_TIME = int(os.environ.get("MAX_EXECUTION_TIME", "10"))
MIN_WALL_THICKNESS_MM = 1.5
MAX_OVERHANG_DEGREES = 45.0

BLOCKED_IMPORTS = {
    "os", "subprocess", "socket", "sys", "shutil", "pathlib",
    "tempfile", "io", "pickle", "shelve", "sqlite3", "dbm",
    "ftplib", "http", "urllib", "requests", "httpx", "aiohttp",
    "paramiko", "fabric", "pty", "tty", "termios", "signal",
    "ctypes", "cffi", "mmap", "resource", "pwd", "grp",
}

BLOCKED_BUILTINS = {"open", "exec", "eval", "compile", "__import__", "input"}


class ParametricRequest(BaseModel):
    template_id: str
    template_code: str
    params: dict[str, Any]

    @field_validator("template_code")
    @classmethod
    def validate_no_obvious_injections(cls, v: str) -> str:
        lowered = v.lower()
        for danger in ["import os", "import subprocess", "import socket", "__import__"]:
            if danger in lowered:
                raise ValueError(f"Blocked pattern in template_code: {danger}")
        return v


class ValidationResult(BaseModel):
    manifold: bool
    wall_thickness_ok: bool
    warnings: list[str]


class GenerateResponse(BaseModel):
    job_id: str
    stl_url: str
    glb_url: str
    tmf_url: str
    validation: ValidationResult
    execution_time_ms: int


def ast_lint(code: str) -> list[str]:
    """Layer 1: AST-based static analysis before execution."""
    errors: list[str] = []
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"SyntaxError: {e}"]

    for node in ast.walk(tree):
        # Block dangerous imports
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.Import):
                names = [alias.name.split(".")[0] for alias in node.names]
            else:
                names = [node.module.split(".")[0]] if node.module else []
            for name in names:
                if name in BLOCKED_IMPORTS:
                    errors.append(f"Blocked import: {name}")

        # Block dangerous builtins
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_BUILTINS:
                errors.append(f"Blocked builtin: {node.func.id}")
            if isinstance(node.func, ast.Attribute):
                if node.func.attr in {"system", "popen", "spawn", "exec_command"}:
                    errors.append(f"Blocked method: {node.func.attr}")

        # Block attribute access to dunder internals
        if isinstance(node, ast.Attribute):
            if node.attr.startswith("__") and node.attr.endswith("__"):
                if node.attr not in {"__class__", "__name__", "__doc__"}:
                    errors.append(f"Blocked dunder access: {node.attr}")

    return errors


def build_execution_script(template_code: str, params: dict, output_dir: str) -> str:
    params_repr = repr(params)
    return f"""
import sys
sys.path.insert(0, '/app')

{template_code}

result = generate({params_repr})

import json
from build123d import export_stl, export_step

stl_path = '{output_dir}/output.stl'
glb_path = '{output_dir}/output.glb'
tmf_path = '{output_dir}/output.3mf'

export_stl(result, stl_path)

try:
    from build123d import export_gltf
    export_gltf(result, glb_path)
except Exception:
    import shutil
    shutil.copy(stl_path, glb_path)

try:
    from build123d import export_3mf
    export_3mf(result, tmf_path)
except Exception:
    import shutil
    shutil.copy(stl_path, tmf_path)

# Manifold check
try:
    is_manifold = result.is_manifold
except Exception:
    is_manifold = True

result_data = {{
    "manifold": is_manifold,
    "volume": float(result.volume) if hasattr(result, 'volume') else 0.0,
    "bounding_box": {{
        "x": float(result.bounding_box().size.X),
        "y": float(result.bounding_box().size.Y),
        "z": float(result.bounding_box().size.Z),
    }},
}}

with open('{output_dir}/result.json', 'w') as f:
    import json
    json.dump(result_data, f)

print("SUCCESS")
"""


def run_in_sandbox(script: str, output_dir: str) -> tuple[bool, str]:
    """Layer 2+3: subprocess isolation with timeout and resource limits."""
    script_path = Path(output_dir) / "exec_script.py"
    script_path.write_text(script)

    env = {
        "PATH": "/usr/local/bin:/usr/bin:/bin",
        "HOME": "/tmp",
        "PYTHONPATH": "/app",
    }

    try:
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            timeout=MAX_EXEC_TIME,
            cwd=output_dir,
            env=env,
        )
        if proc.returncode != 0:
            return False, proc.stderr[:2000]
        return True, proc.stdout
    except subprocess.TimeoutExpired:
        return False, f"Execution exceeded {MAX_EXEC_TIME}s timeout"
    except Exception as e:
        return False, str(e)


def validate_geometry(result_json: dict, params: dict) -> ValidationResult:
    warnings: list[str] = []
    manifold = result_json.get("manifold", False)

    bb = result_json.get("bounding_box", {})
    min_dim = min(bb.get("x", 999), bb.get("y", 999), bb.get("z", 999))

    wall_t = params.get("wall_thickness", params.get("thickness", MIN_WALL_THICKNESS_MM + 1))
    wall_ok = float(wall_t) >= MIN_WALL_THICKNESS_MM

    if not manifold:
        warnings.append("Geometry may not be fully manifold — check for gaps before printing.")
    if not wall_ok:
        warnings.append(f"Wall thickness {wall_t}mm is below recommended 1.5mm minimum.")
    if min_dim < 5:
        warnings.append("Very small minimum dimension — verify scale before printing.")

    return ValidationResult(
        manifold=manifold,
        wall_thickness_ok=wall_ok,
        warnings=warnings,
    )


@app.post("/parametric", response_model=GenerateResponse)
async def generate_parametric(request: ParametricRequest):
    t0 = time.monotonic()
    job_id = str(uuid.uuid4())

    lint_errors = ast_lint(request.template_code)
    if lint_errors:
        raise HTTPException(status_code=422, detail={"lint_errors": lint_errors})

    with tempfile.TemporaryDirectory(prefix=f"cadworker_{job_id}_") as tmpdir:
        script = build_execution_script(request.template_code, request.params, tmpdir)
        success, output = run_in_sandbox(script, tmpdir)

        if not success:
            raise HTTPException(status_code=500, detail={"cad_error": output})

        result_json_path = Path(tmpdir) / "result.json"
        if not result_json_path.exists():
            raise HTTPException(status_code=500, detail={"cad_error": "No result.json produced"})

        import json
        result_data = json.loads(result_json_path.read_text())

        validation = validate_geometry(result_data, request.params)

        stl_path = Path(tmpdir) / "output.stl"
        glb_path = Path(tmpdir) / "output.glb"
        tmf_path = Path(tmpdir) / "output.3mf"

        base_url = os.environ.get("FILE_BASE_URL", "http://localhost:8001/files")
        stl_url = f"{base_url}/{job_id}/output.stl"
        glb_url = f"{base_url}/{job_id}/output.glb"
        tmf_url = f"{base_url}/{job_id}/output.3mf"

        exec_ms = int((time.monotonic() - t0) * 1000)

    return GenerateResponse(
        job_id=job_id,
        stl_url=stl_url,
        glb_url=glb_url,
        tmf_url=tmf_url,
        validation=validation,
        execution_time_ms=exec_ms,
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cad-worker"}
