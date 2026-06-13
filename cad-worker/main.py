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

from validation import validate_stl, PRINTER_PROFILES

app = FastAPI(title="FormForge CAD Worker", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

MAX_EXEC_TIME   = int(os.environ.get("MAX_EXECUTION_TIME", "10"))
FILE_BASE_URL   = os.environ.get("FILE_BASE_URL", "http://localhost:8001/files")

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
    def no_obvious_injection(cls, v: str) -> str:
        low = v.lower()
        for danger in ["import os", "import subprocess", "import socket", "__import__"]:
            if danger in low:
                raise ValueError(f"Blocked pattern: {danger}")
        return v


class PrintIssueOut(BaseModel):
    severity: str
    code: str
    message: str
    detail: str = ""


class DimensionsOut(BaseModel):
    x: float
    y: float
    z: float
    volume_cm3: float
    surface_area_cm2: float


class BedFitOut(BaseModel):
    printer: str
    fits: bool
    bed_x: float
    bed_y: float
    bed_z: float
    margin_x: float
    margin_y: float
    margin_z: float


class PrintReportOut(BaseModel):
    is_printable: bool
    errors: list[PrintIssueOut]
    warnings: list[PrintIssueOut]
    info: list[PrintIssueOut]
    dimensions: DimensionsOut | None
    bed_fit: dict[str, BedFitOut]
    estimated_support_needed: bool
    wall_thickness_min_mm: float | None
    overhang_fraction: float


class GenerateResponse(BaseModel):
    job_id: str
    stl_url: str
    glb_url: str
    tmf_url: str
    print_report: PrintReportOut
    execution_time_ms: int


def ast_lint(code: str) -> list[str]:
    errors: list[str] = []
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"SyntaxError: {e}"]

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = (
                [alias.name.split(".")[0] for alias in node.names]
                if isinstance(node, ast.Import)
                else ([node.module.split(".")[0]] if node.module else [])
            )
            for name in names:
                if name in BLOCKED_IMPORTS:
                    errors.append(f"Blocked import: {name}")

        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_BUILTINS:
                errors.append(f"Blocked builtin: {node.func.id}")
            if isinstance(node.func, ast.Attribute):
                if node.func.attr in {"system", "popen", "spawn", "exec_command"}:
                    errors.append(f"Blocked method: {node.func.attr}")

        if isinstance(node, ast.Attribute):
            if node.attr.startswith("__") and node.attr.endswith("__"):
                if node.attr not in {"__class__", "__name__", "__doc__"}:
                    errors.append(f"Blocked dunder: {node.attr}")

    return errors


def build_execution_script(template_code: str, params: dict, output_dir: str) -> str:
    params_repr = repr(params)
    return f"""
import sys
{template_code}

result = generate({params_repr})

stl_path = '{output_dir}/output.stl'
glb_path = '{output_dir}/output.glb'
tmf_path = '{output_dir}/output.3mf'

# STL export (primary — universally supported)
from build123d import export_stl
export_stl(result, stl_path)

# GLB export for in-app 3D preview
try:
    from build123d import export_gltf
    export_gltf(result, glb_path)
except Exception:
    import shutil
    shutil.copy(stl_path, glb_path)

# 3MF export (includes units metadata — preferred for modern slicers)
try:
    from build123d import export_3mf
    export_3mf(result, tmf_path)
except Exception:
    import shutil
    shutil.copy(stl_path, tmf_path)

import json, os
bb = result.bounding_box()
with open('{output_dir}/cad_meta.json', 'w') as f:
    json.dump({{
        "volume": float(result.volume),
        "is_manifold": getattr(result, 'is_manifold', True),
        "bounding_box": {{
            "x": float(bb.size.X),
            "y": float(bb.size.Y),
            "z": float(bb.size.Z),
        }},
    }}, f)

print("CAD_SUCCESS")
"""


def run_in_sandbox(script: str, output_dir: str) -> tuple[bool, str]:
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
            return False, proc.stderr[:3000]
        if "CAD_SUCCESS" not in proc.stdout:
            return False, f"Script did not complete: {proc.stdout[:1000]}"
        return True, proc.stdout
    except subprocess.TimeoutExpired:
        return False, f"Execution exceeded {MAX_EXEC_TIME}s timeout"
    except Exception as e:
        return False, str(e)


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

        stl_path = Path(tmpdir) / "output.stl"
        if not stl_path.exists():
            raise HTTPException(status_code=500, detail={"cad_error": "STL not produced"})

        # Full geometric validation via trimesh
        report = validate_stl(str(stl_path))

        stl_url = f"{FILE_BASE_URL}/{job_id}/output.stl"
        glb_url = f"{FILE_BASE_URL}/{job_id}/output.glb"
        tmf_url = f"{FILE_BASE_URL}/{job_id}/output.3mf"

        exec_ms = int((time.monotonic() - t0) * 1000)

    report_dict = report.as_dict()

    return GenerateResponse(
        job_id=job_id,
        stl_url=stl_url,
        glb_url=glb_url,
        tmf_url=tmf_url,
        print_report=PrintReportOut(
            is_printable=report_dict["is_printable"],
            errors=report_dict["errors"],
            warnings=report_dict["warnings"],
            info=report_dict["info"],
            dimensions=report_dict["dimensions"],
            bed_fit=report_dict["bed_fit"],
            estimated_support_needed=report_dict["estimated_support_needed"],
            wall_thickness_min_mm=report_dict["wall_thickness_min_mm"],
            overhang_fraction=report_dict["overhang_fraction"],
        ),
        execution_time_ms=exec_ms,
    )


@app.get("/printers")
async def list_printers():
    return [
        {"id": k, "bed_x": v[0], "bed_y": v[1], "bed_z": v[2]}
        for k, v in PRINTER_PROFILES.items()
    ]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cad-worker", "version": "2.0.0"}
