from build123d import *

PARAMS = {
    "hook_width":    {"min": 20,  "max": 80,  "default": 40,  "unit": "mm", "label": "Hook Width"},
    "hook_depth":    {"min": 30,  "max": 100, "default": 60,  "unit": "mm", "label": "Hook Depth"},
    "hook_height":   {"min": 15,  "max": 50,  "default": 25,  "unit": "mm", "label": "Hook Height"},
    "mounting_holes":{"min": 1,   "max": 3,   "default": 2,   "unit": "",   "label": "Mounting Holes"},
    "lip_angle":     {"min": 5,   "max": 30,  "default": 15,  "unit": "deg","label": "Lip Upward Angle"},
    "thickness":     {"min": 4,   "max": 12,  "default": 6,   "unit": "mm", "label": "Material Thickness"},
}

METADATA = {
    "id": "wall_hook",
    "name": "Wall Hook",
    "category": "home",
    "description": "Heavy-duty parametric wall hook with angled lip to retain items and countersunk mounting holes.",
    "thumbnail": "wall_hook.png",
    "tags": ["hook", "wall", "storage", "mount", "hardware"],
    "free": True,
}


def generate(params: dict) -> Shape:
    import math

    hw = params.get("hook_width", PARAMS["hook_width"]["default"])
    hd = params.get("hook_depth", PARAMS["hook_depth"]["default"])
    hh = params.get("hook_height", PARAMS["hook_height"]["default"])
    n_holes = int(params.get("mounting_holes", PARAMS["mounting_holes"]["default"]))
    lip_angle = params.get("lip_angle", PARAMS["lip_angle"]["default"])
    t = params.get("thickness", PARAMS["thickness"]["default"])

    wall_plate_h = max(hh + 20, 60)
    screw_d = 4.5
    countersink_d = 9.0

    with BuildPart() as hook:
        # Wall mounting plate
        with BuildSketch(Plane.XZ) as plate_sk:
            Rectangle(hw, wall_plate_h)
        extrude(amount=t)

        fillet(hook.edges().filter_by(Axis.Z), radius=2.5)

        # Horizontal arm
        arm_z = wall_plate_h / 2
        with BuildSketch(Plane.XY.offset(arm_z)) as arm_sk:
            Rectangle(hw, hd)
        extrude(amount=-t)

        # Upward lip at end of arm
        lip_rad = math.radians(lip_angle)
        lip_h = hd * math.tan(lip_rad)
        with BuildSketch(Plane.XZ.offset(hd / 2)) as lip_sk:
            with BuildLine() as ll:
                Polyline(
                    (-hw / 2, arm_z - t),
                    (hw / 2, arm_z - t),
                    (hw / 2, arm_z - t + lip_h),
                    (-hw / 2, arm_z - t + lip_h),
                    (-hw / 2, arm_z - t),
                )
            make_face()
        extrude(amount=t)

        # Countersunk mounting holes
        if n_holes > 0:
            spacing = wall_plate_h / (n_holes + 1)
            for i in range(n_holes):
                z_pos = spacing * (i + 1)
                with BuildSketch(Plane.XZ) as hole_sk:
                    Circle(screw_d / 2)
                extrude(amount=t + 2, mode=Mode.SUBTRACT)
                with BuildSketch(Plane.XZ) as cs_sk:
                    Circle(countersink_d / 2)
                extrude(amount=t / 2, mode=Mode.SUBTRACT)

    return hook.part
