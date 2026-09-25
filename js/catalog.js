// Every piece that can go in a room. Sizes are inches: w runs left-right, d front-back,
// h tall, z is height off the floor for wall-mounted and hanging pieces.
// At rotation 0 a piece's back faces north (up on the plan); rotate 90 to back it onto the east wall.

export const CATEGORIES = ['Seating', 'Rugs & mats', 'Tables & storage', 'Lighting', 'Soft & decor', 'Plants'];

export const CATALOG = {
  floorCushion:   { name: 'Floor cushion', cat: 'Seating', w: 24, d: 24, h: 6, shape: 'cushion', color: '#b86b4b' },
  floorCushionLg: { short: 'Floor pillow', name: 'Large floor pillow', cat: 'Seating', w: 36, d: 36, h: 7, shape: 'cushion', color: '#7d8b6a' },
  roundCushion:   { short: 'Round cushion', name: 'Round floor cushion', cat: 'Seating', w: 22, d: 22, h: 5, shape: 'roundCushion', color: '#c9a66b' },
  zafu:           { short: 'Zafu', name: 'Meditation cushion (zafu)', cat: 'Seating', w: 14, d: 14, h: 7, shape: 'zafu', color: '#3f4a5a' },
  zabuton:        { short: 'Zabuton', name: 'Meditation mat (zabuton)', cat: 'Seating', w: 28, d: 32, h: 3, shape: 'cushion', color: '#3f4a5a' },
  closetCushion:  { short: 'Nook cushion', name: 'Closet nook cushion', cat: 'Seating', w: 29, d: 75, h: 4, shape: 'cushion', color: '#8a9a8c', note: 'Cut to fit the closet: 76 x 29.5 in inside' },
  lounger:        { name: 'Floor lounger', cat: 'Seating', w: 30, d: 60, h: 22, shape: 'lounger', color: '#6f7f8f' },
  beanbag:        { name: 'Bean bag', cat: 'Seating', w: 36, d: 36, h: 28, shape: 'beanbag', color: '#9c7b5f' },
  pouf:           { name: 'Pouf', cat: 'Seating', w: 18, d: 18, h: 16, shape: 'pouf', color: '#d8cbb5' },
  bolster:        { name: 'Bolster pillow', cat: 'Seating', w: 22, d: 8, h: 8, shape: 'bolster', color: '#c7b8a4' },
  armchair:       { short: 'Reading chair', name: 'Reading chair', cat: 'Seating', w: 32, d: 34, h: 36, shape: 'armchair', color: '#8c6e5a' },
  hammock:        { name: 'Hammock (hung)', cat: 'Seating', w: 118, d: 40, h: 66, shape: 'hammock', color: '#d9c7ad', note: 'Width is anchor to anchor. Needs about 10 ft, and anchors rated for a sideways pull.' },
  hammockStand:   { short: 'Hammock + stand', name: 'Hammock with stand', cat: 'Seating', w: 108, d: 44, h: 44, shape: 'hammockStand', color: '#c9a66b' },
  hangingChair:   { short: 'Hanging chair', name: 'Hanging chair', cat: 'Seating', w: 36, d: 36, h: 44, z: 14, shape: 'hangingChair', color: '#d8cbb5', note: 'Hangs from one ceiling joist.' },
  pillow:         { name: 'Throw pillow', cat: 'Seating', w: 18, d: 6, h: 18, shape: 'pillow', color: '#e0c9a6' },

  rug57:          { short: 'Rug 5×7', name: 'Rug 5 x 7 ft', cat: 'Rugs & mats', w: 84, d: 60, h: 0.4, shape: 'rug', color: '#a8876b', accent: '#6b5443' },
  rug46:          { short: 'Rug 4×6', name: 'Rug 4 x 6 ft', cat: 'Rugs & mats', w: 72, d: 48, h: 0.4, shape: 'rug', color: '#8b9a86', accent: '#56644f' },
  rugRunner:      { short: 'Runner', name: 'Runner 2.5 x 7 ft', cat: 'Rugs & mats', w: 84, d: 30, h: 0.4, shape: 'rug', color: '#b99a7a', accent: '#7a5f47' },
  rugRound:       { short: 'Round rug', name: 'Round rug 6 ft', cat: 'Rugs & mats', w: 72, d: 72, h: 0.4, shape: 'roundRug', color: '#b9a58f', accent: '#8a7560' },
  sheepskin:      { name: 'Sheepskin', cat: 'Rugs & mats', w: 24, d: 36, h: 1, shape: 'sheepskin', color: '#efe8dc' },
  yogaMat:        { name: 'Yoga mat', cat: 'Rugs & mats', w: 24, d: 68, h: 0.25, shape: 'box', color: '#7a8f7e' },

  floorTable:     { short: 'Floor table', name: 'Low floor table', cat: 'Tables & storage', w: 32, d: 20, h: 13, shape: 'table', color: '#8a6a4c' },
  sideTable:      { name: 'Side table', cat: 'Tables & storage', w: 16, d: 16, h: 20, shape: 'roundTable', color: '#8a6a4c' },
  altar:          { name: 'Small altar', cat: 'Tables & storage', w: 24, d: 12, h: 10, shape: 'altar', color: '#5a4636' },
  lowShelf:       { short: 'Bookshelf', name: 'Low bookshelf', cat: 'Tables & storage', w: 36, d: 12, h: 30, shape: 'shelf', color: '#efe9df' },
  tallShelf:      { short: 'Tall shelf', name: 'Tall bookshelf', cat: 'Tables & storage', w: 30, d: 12, h: 72, shape: 'shelf', color: '#efe9df' },
  cubeShelf:      { short: 'Cube shelf', name: 'Cube shelf 2 x 2', cat: 'Tables & storage', w: 30, d: 15, h: 30, shape: 'cubes', color: '#d9c7ad' },
  ladderShelf:    { short: 'Ladder shelf', name: 'Ladder shelf', cat: 'Tables & storage', w: 24, d: 16, h: 60, shape: 'ladderShelf', color: '#b08a64' },
  ledge:          { short: 'Ledge', name: 'Picture-ledge shelf', cat: 'Tables & storage', w: 36, d: 4, h: 5, z: 44, shape: 'ledge', color: '#efe9df', mounted: true },
  basket:         { name: 'Blanket basket', cat: 'Tables & storage', w: 16, d: 16, h: 14, shape: 'basket', color: '#b89b72' },

  floorLamp:      { name: 'Floor lamp', cat: 'Lighting', w: 14, d: 14, h: 60, shape: 'lamp', color: '#f3e6cc', glow: 1 },
  tableLamp:      { name: 'Table lamp', cat: 'Lighting', w: 10, d: 10, h: 16, shape: 'lamp', color: '#f3e6cc', glow: 0.6, mounted: true },
  sconce:         { name: 'Plug-in wall sconce', cat: 'Lighting', w: 8, d: 9, h: 10, z: 46, shape: 'sconce', color: '#f3e6cc', glow: 0.6, mounted: true },
  saltLamp:       { name: 'Salt lamp', cat: 'Lighting', w: 6, d: 6, h: 9, shape: 'saltLamp', color: '#e8935a', glow: 0.35, mounted: true },
  lantern:        { short: 'Lantern', name: 'Paper lantern pendant', cat: 'Lighting', w: 20, d: 20, h: 20, z: 56, shape: 'lantern', color: '#f6efe2', glow: 1, mounted: true },
  stringLights:   { short: 'String lights', name: 'String lights (6 ft)', cat: 'Lighting', w: 72, d: 2, h: 2, z: 80, shape: 'string', color: '#ffd9a0', glow: 0.5, mounted: true },
  candles:        { name: 'Candle cluster', cat: 'Lighting', w: 8, d: 8, h: 6, shape: 'candles', color: '#f4ecdc', glow: 0.25, mounted: true },

  canopy:         { short: 'Canopy', name: 'Ceiling canopy', cat: 'Soft & decor', w: 60, d: 60, h: 88, shape: 'canopy', color: '#efe6d8' },
  curtain:        { name: 'Curtain panel', cat: 'Soft & decor', w: 30, d: 2, h: 80, shape: 'curtain', color: '#c9b79c', mounted: true },
  tapestry:       { short: 'Tapestry', name: 'Wall tapestry', cat: 'Soft & decor', w: 48, d: 1, h: 36, z: 40, shape: 'panel', color: '#8c6e5a', mounted: true },
  art:            { name: 'Framed art', cat: 'Soft & decor', w: 24, d: 1.5, h: 30, z: 42, shape: 'frame', color: '#d6cfc4', mounted: true },
  mirror:         { name: 'Mirror', cat: 'Soft & decor', w: 24, d: 1, h: 36, z: 30, shape: 'mirror', color: '#cfd8dc', mounted: true },
  divider:        { short: 'Screen', name: 'Folding screen', cat: 'Soft & decor', w: 54, d: 12, h: 66, shape: 'divider', color: '#d8c8ad' },

  plantTall:      { short: 'Plant', name: 'Tall plant', cat: 'Plants', w: 20, d: 20, h: 60, shape: 'plant', color: '#4f7a4a' },
  plantSmall:     { name: 'Small plant', cat: 'Plants', w: 9, d: 9, h: 16, shape: 'plant', color: '#5b8a52', mounted: true },
  plantHanging:   { name: 'Hanging plant', cat: 'Plants', w: 12, d: 12, h: 24, z: 58, shape: 'hangingPlant', color: '#5b8a52', mounted: true },
};

// Pieces that hang or mount on a wall show as dashed outlines on the plan.
export const OVERHEAD = new Set(['lantern', 'string', 'canopy', 'panel', 'frame', 'mirror', 'ledge', 'hangingPlant', 'sconce']);

export const SWATCHES = ['#b86b4b', '#c9a66b', '#7d8b6a', '#8a9a8c', '#3f4a5a', '#6f7f8f', '#9c7b5f', '#d8cbb5', '#efe8dc', '#8c6e5a', '#a64d5e', '#2f2d2a'];

export function spec(item) {
  const base = CATALOG[item.type];
  return {
    ...base,
    w: item.w ?? base.w,
    d: item.d ?? base.d,
    h: item.h ?? base.h,
    z: item.z ?? base.z ?? 0,
    color: item.color ?? base.color,
    accent: item.accent ?? base.accent,
  };
}
