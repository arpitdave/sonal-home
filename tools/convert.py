"""Convert the Floorplanner .fml export (from the Funda listing) into house.json for the 3D viewer.

Usage: python3 tools/convert.py data/floorplanner-190230043.fml house.json
All units are centimetres. Plan x -> world x, plan y -> world z.
"""
import json
import sys

ROOM_NAMES = {  # area guid -> (name, floor material)
    "2a8310": ("Living room", "oak"),
    "97e7ff": ("Bedroom 1", "oak"),
    "47308e": ("Bedroom 2", "oak"),
    "9ca47d": ("Bathroom", "tile"),
    "89f720": ("Shower", "tile"),
    "736124": ("Utility room", "tile"),
    "0ffddc": ("Meter cupboard", "concrete"),
    "e4f931": ("Duct", "duct"),
}
SURFACE_NAMES = {"Balkon": ("Balcony", "deck"), "Entree": ("Hall", "oak"), None: ("Kitchen", "oak")}

FIXTURES = {  # refid prefix -> (label, colour)
    "856317b2": ("Washing machine", "#f2f2f2"),
    "44194f22": ("Hob", "#222222"),
    "0f68ea02": ("Sink", "#c8ccd0"),
    "cf12af67": ("Washbasin", "#ffffff"),
    "33e2521c": ("Boiler", "#f4f4f4"),
    "d7ab51af": ("Meters", "#9aa0a6"),
    "416c68a8": ("Fridge column", "#e8e6e1"),
    "f6402c58": ("Kitchen counter", "#e8e6e1"),
    "cb00ebb2": ("Shower head", "#c8ccd0"),
    "80e78b83": ("Toilet frame", "#ffffff"),
    "b9782bc3": ("Toilet", "#ffffff"),
}


def pt(p):
    return [round(p["x"], 1), round(p["y"], 1)]


def main(src, dst):
    d = json.load(open(src))
    design = d["floors"][0]["designs"][0]
    wall_h = d["settings"]["wallHeight"] + 4  # plan label says H: 2.57m

    walls = []
    for w in design["walls"]:
        y_mid = (w["a"]["y"] + w["b"]["y"]) / 2
        walls.append({
            "a": pt(w["a"]), "b": pt(w["b"]),
            "t": w["thickness"], "balance": w["balance"],
            "h": min(w["az"]["h"], wall_h),
            "railing": w["az"]["h"] <= 100,
            "facade": w["thickness"] >= 24 and abs(abs(y_mid) - 600) < 150,
            "openings": [{
                "type": o["type"], "t": o["t"], "w": o["width"],
                "z": o.get("z", 0), "h": o.get("z_height", 220),
            } for o in w["openings"]],
        })

    rooms = []
    for a in design["areas"]:
        name, mat = ROOM_NAMES[a["guid"]]
        rooms.append({"name": name, "material": mat, "poly": [pt(p) for p in a["poly"]]})
    for s in design["surfaces"]:
        name, mat = SURFACE_NAMES[s.get("customName")]
        rooms.append({"name": name, "material": mat, "poly": [pt(p) for p in s["poly"]], "overlay": True})

    fixtures = []
    for i in design["items"]:
        key = i["refid"][:8]
        if key not in FIXTURES:
            continue
        label, colour = FIXTURES[key]
        fixtures.append({
            "name": label, "color": colour,
            "x": round(i["x"], 1), "z": round(i["y"], 1), "y": i["z"],
            "w": round(i["width"], 1), "d": round(i["height"], 1), "h": round(i["z_height"], 1),
            "rot": round(i["rotation"], 2),
        })

    out = {"source": "Funda / Floorplanner project 190230043, Tweede Jan Steenstraat 49-B, Amsterdam",
           "wallHeight": wall_h, "walls": walls, "rooms": rooms, "fixtures": fixtures}
    json.dump(out, open(dst, "w"), indent=1)
    print(f"{len(walls)} walls, {len(rooms)} rooms, {len(fixtures)} fixtures -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
