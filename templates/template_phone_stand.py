from build123d import *

PARAMS = {
    "phone_width":    {"min": 60,  "max": 90,  "default": 75,  "unit": "mm", "label": "Phone Width"},
    "phone_thickness":{"min": 6,   "max": 16,  "default": 9,   "unit": "mm", "label": "Phone Thickness"},
    "tilt_angle":     {"min": 60,  "max": 85,  "default": 70,  "unit": "deg","label": "Viewing Angle"},
    "base_depth":     {"min": 60,  "max": 120, "default": 80,  "unit": "mm", "label": "Base Depth"},
    "has_cable_slot": {"type": "bool", "default": True,         "label": "Cable Slot"},
}

METADATA = {
    "id": "phone_stand",
    "name": "Phone Stand",
    "category": "desk",
    "description": "Adjustable-angle phone stand with optional cable management slot.",
    "thumbnail": "phone_stand.png",
    "tags": ["phone", "stand", "desk", "cable"],
    "free": True,
}


def generate(params: dict) -> Shape:
    import math

    pw = params.get("phone_width", PARAMS["phone_width"]["default"])
    pt = params.get("phone_thickness", PARAMS["phone_thickness"]["default"])
    angle = params.get("tilt_angle", PARAMS["tilt_angle"]["default"])
    bd = params.get("base_depth", PARAMS["base_depth"]["default"])
    cable_slot = params.get("has_cable_slot", PARAMS["has_cable_slot"]["default"])

    wall_t = 3.0
    total_w = pw + wall_t * 2
    base_h = 4.0
    cradle_depth = pt + wall_t * 2
    cradle_h = 20.0

    angle_rad = math.radians(angle)
    back_h = bd * math.tan(angle_rad)

    with BuildPart() as stand:
        # Base plate
        with BuildSketch(Plane.XY) as base_sk:
            Rectangle(total_w, bd)
        extrude(amount=base_h)

        # Back support — wedge
        with BuildSketch(Plane.XZ.offset(-bd / 2)) as back_sk:
            with BuildLine() as bl:
                Polyline(
                    (-total_w / 2, base_h),
                    (total_w / 2, base_h),
                    (total_w / 2, base_h + back_h),
                    (-total_w / 2, base_h + back_h),
                    (-total_w / 2, base_h),
                )
            make_face()
        extrude(amount=wall_t)

        # Phone cradle ledge at front
        with BuildSketch(Plane.XY.offset(base_h)) as ledge_sk:
            Rectangle(total_w, cradle_depth)
        extrude(amount=cradle_h)
        with BuildSketch(Plane.XY.offset(base_h)) as ledge_cut:
            Rectangle(pw, pt)
        extrude(amount=cradle_h, mode=Mode.SUBTRACT)

        fillet(stand.edges().filter_by(Axis.Z), radius=2.0)

        if cable_slot:
            slot_w = 8.0
            slot_h = 6.0
            with BuildSketch(Plane.XY) as slot_sk:
                Rectangle(slot_w, cradle_depth + 2)
            extrude(amount=base_h + slot_h, mode=Mode.SUBTRACT)

    return stand.part
