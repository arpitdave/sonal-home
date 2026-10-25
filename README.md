# Tweede Jan Steenstraat 49-B — 3D home viewer

Start: `python3 serve.py`, then open http://localhost:8787

- `house.json` – the apartment shell (walls, doors, windows, rooms, kitchen/bathroom fixtures), in cm,
  generated from the Floorplanner data behind the Funda listing: `python3 tools/convert.py data/floorplanner-190230043.fml house.json`
- `furniture.json` – placed furniture; the viewer saves here automatically. Each item:
  `{type, name, w, d, h, x, z, rot, color, elevation}` (cm, rot in degrees clockwise seen from above; plan x → right, z → down/south).
- `models.js` – furniture shapes and presets.
