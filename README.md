# Basement nook planner

A to-scale 3D model and floor plan of one basement room, built for trying out layouts for a reading and meditation nook. Everything is measured in inches from tape measurements, so what fits here fits in the real room.

## Views

- **3D:** orbit around the room. Walls between you and the room fade out so you can see inside.
- **Top:** straight down, like the plan.
- **Eye level:** stand or sit inside the room. Drag to look around, and tap or drag on the plan to move.

The version menu switches between saved layouts of the room. Each version has its own link (`?v=<id>`), so a specific layout can be shared directly.

## Files

- `rooms/basement.json`: the room itself, including the walls, openings, post, beam, closet, window, fixtures and the raw measurements.
- `layouts/index.json`: the list of versions shown in the menu.
- `layouts/<id>.json`: one layout. It names its room and lists the items placed in it.
- `js/scene.js` builds the 3D model, `js/plan.js` draws the floor plan, and `js/app.js` wires up the page.

To add a version, copy a layout file, give it a new `id`, and add a line for it to `layouts/index.json`.

## Run locally

It's a static site with no build step. Serve the folder with any static server, for example:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Three.js loads from the jsDelivr CDN.
