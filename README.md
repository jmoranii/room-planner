# Basement nook planner

A to-scale 3D model and floor plan of one basement room, built for trying out layouts for a reading and meditation nook. Everything is measured in inches from tape measurements, so what fits here fits in the real room.

## Views

- **3D:** orbit around the room. Walls between you and the room fade out so you can see inside.
- **Top:** straight down, like the plan.
- **Eye level:** stand or sit inside the room. Drag to look around. To walk, use the arrow buttons (hold to keep going), double-tap the floor, tap the plan, or use the arrow keys or WASD.

**Day / Evening** switches the lighting. In Evening, the lamps, lanterns, string lights and candles are the only light.

## Arranging pieces

- **Add pieces** has about 45 furniture and decor pieces at real sizes, grouped into seating, rugs and mats, tables and storage, lighting, soft decor, and plants.
- **Move a piece:** double-tap (or double-click) it to select it, then drag it, in the 3D view or on the plan. Only the selected piece moves, so stray touches just orbit the view. A toolbar over the 3D view has turn, nudge, remove and Done buttons. Then you can turn it (buttons, or R / Shift+R), resize it, lift it off the floor (for shelves, lanterns and art), recolor it, duplicate it or remove it. The arrow keys nudge a piece 1 inch, or 6 inches with Shift.
- **Checks** flags anything in a door swing, in front of the egress window, where the closet doors fold, or on top of the floor drain cover in the closet.
- **Closet doors** can be turned off under Room options, for layouts that use the closet as a nook.
- Edits are kept on the device you made them on. To keep one for good, press **Copy layout** and add it as a new file under `layouts/`.

The version menu switches between saved layouts of the room, including twelve starting ideas (among them a closet reading nook, zen meditation room, cozy floor lounge, reading library, plant sanctuary, several hammock placements, and a simple starter). Each version has its own link (`?v=<id>`), so a specific layout can be shared directly.

## Files

- `rooms/basement.json`: the room itself, including the walls, openings, post, beam, closet, window, fixtures and the raw measurements.
- `layouts/index.json`: the list of versions shown in the menu.
- `layouts/<id>.json`: one layout. It names its room and lists the items placed in it. It can also set `mood` (day or evening), `options` (for example `closetDoors: false`), and a starting `eye` viewpoint.
- `js/catalog.js`: the pieces and their sizes. `js/items3d.js` builds each piece in 3D.
- `js/scene.js` builds the room, `js/plan.js` draws the floor plan, `js/checks.js` runs the clearance checks, and `js/app.js` wires up the page.

To add a version, copy a layout file, give it a new `id`, and add a line for it to `layouts/index.json`.

## Run locally

It's a static site with no build step. Serve the folder with any static server, for example:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Three.js loads from the jsDelivr CDN.
