from build123d import *

PARAMS = {
    "width":          {"min": 50,  "max": 300, "default": 100, "unit": "mm", "label": "Width"},
    "depth":          {"min": 50,  "max": 300, "default": 80,  "unit": "mm", "label": "Depth"},
    "height":         {"min": 20,  "max": 200, "default": 60,  "unit": "mm", "label": "Height"},
    "wall_thickness": {"min": 1.5, "max": 5,   "default": 2,   "unit": "mm", "label": "Wall Thickness"},
    "has_lid":        {"type": "bool", "default": False,        "label": "Add Lid"},
    "fillet_radius":  {"min": 0,   "max": 8,   "default": 2,   "unit": "mm", "label": "Corner Rounding"},
}

METADATA = {
    "id": "simple_box",
    "name": "Simple Box",
    "category": "storage",
    "description": "A clean parametric storage box with optional lid and rounded corners.",
    "thumbnail": "simple_box.png",
    "tags": ["box", "storage", "container", "beginner"],
    "free": True,
}


def generate(params: dict) -> Shape:
    w = params.get("width", PARAMS["width"]["default"])
    d = params.get("depth", PARAMS["depth"]["default"])
    h = params.get("height", PARAMS["height"]["default"])
    t = params.get("wall_thickness", PARAMS["wall_thickness"]["default"])
    has_lid = params.get("has_lid", PARAMS["has_lid"]["default"])
    fr = params.get("fillet_radius", PARAMS["fillet_radius"]["default"])

    t = max(1.5, min(t, min(w, d, h) / 4))
    fr = max(0, min(fr, t - 0.1))

    with BuildPart() as box_part:
        with BuildSketch(Plane.XY) as sk:
            Rectangle(w, d)
        extrude(amount=h)

        if fr > 0:
            fillet(box_part.edges().filter_by(Axis.Z), radius=fr)

        # Shell to hollow out (open top)
        shell(box_part.faces().sort_by(Axis.Z)[-1], amount=-t)

    result = box_part.part

    if has_lid:
        lid_h = max(t * 2, 8)
        lid_clearance = 0.3
        with BuildPart() as lid_part:
            with BuildSketch(Plane.XY.offset(h)) as lid_sk:
                Rectangle(w + t * 2, d + t * 2)
            extrude(amount=lid_h)
            with BuildSketch(Plane.XY.offset(h)) as inner_sk:
                Rectangle(w + lid_clearance, d + lid_clearance)
            extrude(amount=lid_h - t, mode=Mode.SUBTRACT)

        result = result + lid_part.part

    return result
