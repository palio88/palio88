from build123d import *

PARAMS = {
    "plate_width":   {"min": 60,  "max": 300, "default": 150, "unit": "mm", "label": "Plate Width"},
    "plate_height":  {"min": 25,  "max": 80,  "default": 45,  "unit": "mm", "label": "Plate Height"},
    "plate_depth":   {"min": 3,   "max": 10,  "default": 5,   "unit": "mm", "label": "Plate Thickness"},
    "text_depth":    {"min": 0.5, "max": 3,   "default": 1.2, "unit": "mm", "label": "Text Emboss Depth"},
    "text_content":  {"type": "text", "default": "FORMFORGE",  "label": "Name Text"},
    "has_stand":     {"type": "bool", "default": True,         "label": "Include Stand"},
    "corner_style":  {"type": "select", "options": ["rounded", "chamfered", "sharp"], "default": "rounded", "label": "Corner Style"},
}

METADATA = {
    "id": "name_plate",
    "name": "Name Plate",
    "category": "personalized",
    "description": "Embossed name plate or desk sign — add text, choose corners, optionally include a stand.",
    "thumbnail": "name_plate.png",
    "tags": ["nameplate", "sign", "desk", "text", "personalized"],
    "free": False,
}


def generate(params: dict) -> Shape:
    pw = params.get("plate_width", PARAMS["plate_width"]["default"])
    ph = params.get("plate_height", PARAMS["plate_height"]["default"])
    pd = params.get("plate_depth", PARAMS["plate_depth"]["default"])
    td = params.get("text_depth", PARAMS["text_depth"]["default"])
    text = params.get("text_content", PARAMS["text_content"]["default"])
    has_stand = params.get("has_stand", PARAMS["has_stand"]["default"])
    corner_style = params.get("corner_style", PARAMS["corner_style"]["default"])

    td = min(td, pd - 0.5)

    with BuildPart() as plate:
        with BuildSketch(Plane.XY) as sk:
            Rectangle(pw, ph)
        extrude(amount=pd)

        if corner_style == "rounded":
            fillet(plate.edges().filter_by(Axis.Z), radius=3.0)
        elif corner_style == "chamfered":
            chamfer(plate.edges().filter_by(Axis.Z), length=4.0)

        # Text emboss — using build123d Text shape on top face
        if text:
            font_size = min(ph * 0.45, pw / max(1, len(text)) * 1.8)
            font_size = max(8.0, font_size)
            with BuildSketch(Plane.XY.offset(pd)) as text_sk:
                Text(text, font_size=font_size, align=(Align.CENTER, Align.CENTER))
            extrude(amount=td)

        if has_stand:
            stand_w = pw * 0.6
            stand_h = 5.0
            stand_angle_depth = ph * 0.4

            with BuildSketch(Plane.XY) as stand_base_sk:
                Rectangle(stand_w, stand_angle_depth)
            stand_base = extrude(amount=stand_h)

            with BuildSketch(Plane.XZ.offset(-ph / 2)) as brace_sk:
                with BuildLine() as bl:
                    Polyline(
                        (-stand_w / 2, 0),
                        (stand_w / 2, 0),
                        (stand_w / 2, pd),
                        (-stand_w / 2, pd),
                        (-stand_w / 2, 0),
                    )
                make_face()
            extrude(amount=stand_angle_depth)

    return plate.part
