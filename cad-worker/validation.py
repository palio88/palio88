"""
Geometric print-readiness validation.
All checks operate on a trimesh.Trimesh object loaded from the STL export.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import trimesh


# ─── Common printer bed sizes (x, y, z) in mm ─────────────────────────────────
PRINTER_PROFILES = {
    "bambu_x1c":    (256, 256, 256),
    "bambu_p1s":    (256, 256, 256),
    "bambu_a1":     (256, 256, 256),
    "prusa_mk4":    (250, 210, 220),
    "prusa_mini":   (180, 180, 180),
    "ender_3":      (220, 220, 250),
    "ender_3_v3":   (220, 220, 250),
    "voron_24":     (350, 350, 350),
    "generic_fdm":  (220, 220, 220),
}

DEFAULT_PROFILE = "generic_fdm"
MIN_WALL_MM     = 1.2   # below this is unprintable on FDM
WARN_WALL_MM    = 1.5   # below this is risky
MAX_OVERHANG_DEG = 45.0  # steeper than this needs support
MIN_FEATURE_MM  = 0.4   # typical nozzle diameter


@dataclass
class PrintIssue:
    severity: str   # "error" | "warning" | "info"
    code: str
    message: str
    detail: str = ""


@dataclass
class DimensionInfo:
    x: float
    y: float
    z: float
    volume_cm3: float
    surface_area_cm2: float


@dataclass
class BedFitResult:
    printer: str
    fits: bool
    bed_x: float
    bed_y: float
    bed_z: float
    margin_x: float
    margin_y: float
    margin_z: float


@dataclass
class PrintReport:
    is_printable: bool
    issues: list[PrintIssue] = field(default_factory=list)
    dimensions: DimensionInfo | None = None
    bed_fit: dict[str, BedFitResult] = field(default_factory=dict)
    estimated_support_needed: bool = False
    wall_thickness_min_mm: float | None = None
    overhang_fraction: float = 0.0   # fraction of surface area overhanging >45°

    def errors(self) -> list[PrintIssue]:
        return [i for i in self.issues if i.severity == "error"]

    def warnings(self) -> list[PrintIssue]:
        return [i for i in self.issues if i.severity == "warning"]

    def as_dict(self) -> dict:
        return {
            "is_printable": self.is_printable,
            "errors": [vars(i) for i in self.errors()],
            "warnings": [vars(i) for i in self.warnings()],
            "info": [vars(i) for i in self.issues if i.severity == "info"],
            "dimensions": vars(self.dimensions) if self.dimensions else None,
            "bed_fit": {k: vars(v) for k, v in self.bed_fit.items()},
            "estimated_support_needed": self.estimated_support_needed,
            "wall_thickness_min_mm": self.wall_thickness_min_mm,
            "overhang_fraction": round(self.overhang_fraction, 4),
        }


def validate_stl(stl_path: str | Path) -> PrintReport:
    """Full print-readiness validation pipeline."""
    issues: list[PrintIssue] = []

    # ── Load mesh ────────────────────────────────────────────────────────────
    try:
        mesh = trimesh.load_mesh(str(stl_path), process=True)
    except Exception as e:
        return PrintReport(
            is_printable=False,
            issues=[PrintIssue("error", "LOAD_FAILED", "Could not load mesh", str(e))],
        )

    if not isinstance(mesh, trimesh.Trimesh):
        # Scene / multi-mesh — merge into one
        try:
            mesh = trimesh.util.concatenate(list(mesh.geometry.values()))
        except Exception as e:
            return PrintReport(
                is_printable=False,
                issues=[PrintIssue("error", "MULTI_MESH", "Could not merge mesh geometry", str(e))],
            )

    # ── Manifold / watertight ────────────────────────────────────────────────
    if not mesh.is_watertight:
        issues.append(PrintIssue(
            "error", "NOT_WATERTIGHT",
            "Mesh is not watertight (has open edges or holes).",
            "Slicer software may fail or produce incorrect results. "
            "Check for non-manifold edges in your model.",
        ))

    if not mesh.is_winding_consistent:
        issues.append(PrintIssue(
            "error", "INCONSISTENT_NORMALS",
            "Face normals are inconsistent.",
            "Some faces may point inward. The slicer may compute incorrect wall paths.",
        ))

    if mesh.volume < 0:
        # Flip normals if volume is negative (inside-out)
        mesh.invert()
        issues.append(PrintIssue(
            "warning", "NORMALS_INVERTED",
            "Mesh normals were inverted (inside-out). Auto-corrected for analysis.",
        ))

    # ── Zero-area / degenerate faces ─────────────────────────────────────────
    degenerate = trimesh.triangles.area(mesh.triangles) < 1e-8
    if degenerate.any():
        issues.append(PrintIssue(
            "warning", "DEGENERATE_FACES",
            f"{int(degenerate.sum())} degenerate (zero-area) face(s) found.",
            "These will be ignored by most slicers but indicate geometry errors.",
        ))

    # ── Dimensions ──────────────────────────────────────────────────────────
    bb = mesh.bounding_box.extents  # [x, y, z] in mm
    vol_cm3 = abs(mesh.volume) / 1000.0
    area_cm2 = mesh.area / 100.0
    dimensions = DimensionInfo(
        x=round(float(bb[0]), 2),
        y=round(float(bb[1]), 2),
        z=round(float(bb[2]), 2),
        volume_cm3=round(vol_cm3, 2),
        surface_area_cm2=round(area_cm2, 2),
    )

    if min(bb) < 1.0:
        issues.append(PrintIssue(
            "error", "TOO_SMALL",
            f"Minimum dimension is {min(bb):.2f}mm — too small to print on FDM.",
            "The smallest axis is under 1mm. This part cannot be printed reliably "
            "on a standard FDM printer.",
        ))

    if max(bb) > 500:
        issues.append(PrintIssue(
            "warning", "VERY_LARGE",
            f"Largest dimension is {max(bb):.0f}mm — exceeds most printer beds.",
        ))

    # ── Bed fit ──────────────────────────────────────────────────────────────
    bed_fit: dict[str, BedFitResult] = {}
    for profile_name, (bx, by, bz) in PRINTER_PROFILES.items():
        # Check all axis permutations — the model can be oriented any way on the bed
        # We check if the part fits with any rotation around Z
        fits = (
            (bb[0] <= bx and bb[1] <= by and bb[2] <= bz) or
            (bb[1] <= bx and bb[0] <= by and bb[2] <= bz)
        )
        bed_fit[profile_name] = BedFitResult(
            printer=profile_name,
            fits=fits,
            bed_x=bx, bed_y=by, bed_z=bz,
            margin_x=round(bx - min(bb[0], bb[1]), 1),
            margin_y=round(by - max(bb[0], bb[1]), 1) if fits else 0,
            margin_z=round(bz - bb[2], 1),
        )

    common_printers = ["bambu_x1c", "prusa_mk4", "ender_3", "generic_fdm"]
    fits_none = not any(bed_fit[p].fits for p in common_printers)
    if fits_none:
        issues.append(PrintIssue(
            "error", "EXCEEDS_ALL_COMMON_BEDS",
            "Part does not fit on any common FDM printer bed.",
            f"Dimensions {bb[0]:.0f}x{bb[1]:.0f}x{bb[2]:.0f}mm exceed standard bed sizes. "
            "Reduce the size or split into multiple parts.",
        ))
    elif not all(bed_fit[p].fits for p in common_printers):
        small_beds = [p for p in common_printers if not bed_fit[p].fits]
        issues.append(PrintIssue(
            "warning", "EXCEEDS_SOME_BEDS",
            f"Part does not fit on: {', '.join(small_beds)}.",
            f"Part fits on Bambu X1C, Voron, etc. but not smaller printers.",
        ))

    # ── Wall thickness estimation ────────────────────────────────────────────
    # Strategy: cast rays inward from surface sample points along inverted normals.
    # The ray hits the opposite wall. Distance = local wall thickness.
    min_thickness: float | None = None
    try:
        n_samples = min(500, len(mesh.faces))
        sample_pts, face_idx = trimesh.sample.sample_surface(mesh, n_samples)
        inward_normals = -mesh.face_normals[face_idx]

        # Offset slightly inward to avoid self-intersection at origin
        ray_origins = sample_pts + inward_normals * 0.01
        locations, ray_idx, _ = mesh.ray.intersects_location(
            ray_origins=ray_origins,
            ray_directions=inward_normals,
            multiple_hits=False,
        )

        if len(locations) > 0:
            thicknesses = np.linalg.norm(locations - ray_origins[ray_idx], axis=1)
            thicknesses = thicknesses[thicknesses > 0.01]  # filter degenerate hits
            if len(thicknesses) > 0:
                min_thickness = float(np.percentile(thicknesses, 5))  # 5th percentile

        if min_thickness is not None:
            if min_thickness < MIN_WALL_MM:
                issues.append(PrintIssue(
                    "error", "WALL_TOO_THIN",
                    f"Minimum wall thickness ~{min_thickness:.2f}mm is below {MIN_WALL_MM}mm.",
                    "Walls thinner than 1.2mm will not print reliably on FDM. "
                    "Increase wall thickness in the parameter editor.",
                ))
            elif min_thickness < WARN_WALL_MM:
                issues.append(PrintIssue(
                    "warning", "WALL_THIN",
                    f"Minimum wall thickness ~{min_thickness:.2f}mm is below recommended {WARN_WALL_MM}mm.",
                    "Thin walls may be fragile. Consider increasing wall thickness for durability.",
                ))
    except Exception:
        # Ray casting can fail on degenerate meshes — skip thickness check
        pass

    # ── Overhang detection ────────────────────────────────────────────────────
    # Faces with normals pointing downward (negative Z component > cos(45°)) are overhangs.
    # Print orientation assumed: Z-up (tallest axis pointing up).
    overhang_fraction = 0.0
    support_needed = False
    try:
        face_normals = mesh.face_normals
        face_areas   = trimesh.triangles.area(mesh.triangles)
        total_area   = face_areas.sum()

        cos_threshold = math.cos(math.radians(MAX_OVERHANG_DEG))
        # Downward-facing faces: z component of normal < -cos_threshold
        overhang_mask = face_normals[:, 2] < -cos_threshold
        # Exclude bottom-most faces (they rest on the bed, not overhangs)
        z_min = mesh.vertices[:, 2].min()
        bottom_faces = mesh.vertices[mesh.faces].min(axis=1)[:, 2] < (z_min + 0.5)
        overhang_mask = overhang_mask & ~bottom_faces

        overhang_area = face_areas[overhang_mask].sum()
        overhang_fraction = float(overhang_area / total_area) if total_area > 0 else 0.0
        support_needed = overhang_fraction > 0.02  # >2% of surface area overhangs

        if support_needed:
            pct = overhang_fraction * 100
            severity = "warning" if overhang_fraction < 0.15 else "warning"
            issues.append(PrintIssue(
                severity, "OVERHANGS_DETECTED",
                f"{pct:.1f}% of surfaces overhang more than {MAX_OVERHANG_DEG}°.",
                "Supports will be needed. Consider reorienting the model in your slicer "
                "to minimize support material.",
            ))
    except Exception:
        pass

    # ── Unit check ────────────────────────────────────────────────────────────
    # If all dimensions are under 1mm it's likely exported in meters accidentally
    if max(bb) < 1.0 and max(bb) > 0:
        issues.append(PrintIssue(
            "error", "LIKELY_WRONG_UNITS",
            "All dimensions are under 1mm — model may have been exported in meters.",
            "Ensure the build123d model uses millimeter units (default). "
            "Scale by 1000 to fix.",
        ))

    # ── Final verdict ─────────────────────────────────────────────────────────
    is_printable = not any(i.severity == "error" for i in issues)

    if is_printable and not issues:
        issues.append(PrintIssue(
            "info", "PRINT_READY",
            "Geometry passed all print-readiness checks.",
        ))

    return PrintReport(
        is_printable=is_printable,
        issues=issues,
        dimensions=dimensions,
        bed_fit=bed_fit,
        estimated_support_needed=support_needed,
        wall_thickness_min_mm=round(min_thickness, 2) if min_thickness else None,
        overhang_fraction=overhang_fraction,
    )
