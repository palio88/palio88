from build123d import *

PARAMS = {
    "width":          {"min": 80,  "max": 300, "default": 180, "unit": "mm", "label": "Width"},
    "depth":          {"min": 60,  "max": 200, "default": 120, "unit": "mm", "label": "Depth"},
    "height":         {"min": 40,  "max": 120, "default": 70,  "unit": "mm", "label": "Height"},
    "cable_slots":    {"min": 1,   "max": 4,   "default": 2,   "unit": "",   "label": "Cable Slots (per side)"},
    "slot_diameter":  {"min": 8,   "max": 25,  "default": 14,  "unit": "mm", "label": "Slot Diameter"},
    "wall_thickness": {"min": 2,   "max": 5,   "default": 2.5, "unit": "mm", "label": "Wall Thickness"},
}

METADATA = {
    "id": "cable_box",
    "name": "Cable Management Box",
    "category": "storage",
    "description": "Desktop cable management box with configurable side slots for power strips and adapters.",
    "thumbnail": "cable_box.png",
    "tags": ["cable", "desk", "organizer", "storage"],
    "free": False,
}


def generate(params: dict) -> Shape:
    import math

    w = params.get("width", PARAMS["width"]["default"])
    d = params.get("depth", PARAMS["depth"]["default"])
    h = params.get("height", PARAMS["height"]["default"])
    n_slots = int(params.get("cable_slots", PARAMS["cable_slots"]["default"]))
    slot_d = params.get("slot_diameter", PARAMS["slot_diameter"]["default"])
    t = params.get("wall_thickness", PARAMS["wall_thickness"]["default"])

    t = max(2.0, min(t, min(w, d, h) / 6))
    slot_d = min(slot_d, h / 2)

    with BuildPart() as box:
        with BuildSketch(Plane.XY) as sk:
            Rectangle(w, d)
        extrude(amount=h)
        shell(box.faces().sort_by(Axis.Z)[-1], amount=-t)
        fillet(box.edges().filter_by(Axis.Z), radius=3.0)

        # Cable slots on long sides (front + back)
        for side_y in [-d / 2, d / 2]:
            spacing = w / (n_slots + 1)
            for i in range(n_slots):
                x_pos = -w / 2 + spacing * (i + 1)
                slot_center_z = slot_d / 2 + t
                with BuildSketch(Plane.XZ.offset(side_y)) as slot_sk:
                    Circle(slot_d / 2)
                extrude(amount=t * 2, both=True, mode=Mode.SUBTRACT)

        # Ventilation holes on top lid area (bottom of box — no lid)
        vent_rows = max(1, int((d - t * 4) / 20))
        vent_cols = max(1, int((w - t * 4) / 20))
        vent_r = 3.5
        for row in range(vent_rows):
            for col in range(vent_cols):
                xv = -w / 2 + t * 2 + col * ((w - t * 4) / max(1, vent_cols - 1)) if vent_cols > 1 else 0
                yv = -d / 2 + t * 2 + row * ((d - t * 4) / max(1, vent_rows - 1)) if vent_rows > 1 else 0
                with BuildSketch(Plane.XY) as vent_sk:
                    Circle(vent_r)
                extrude(amount=t, mode=Mode.SUBTRACT)

    return box.part
