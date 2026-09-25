import { spec, OVERHEAD } from './catalog.js';
import { segments, along, pointInRoom } from './geometry.js';

// Plain-language checks for things that matter in this room: the egress window,
// door swings, the floor drain cover in the closet, and pieces that fall outside the walls.

function footprint(it) {
  const s = spec(it);
  const a = ((it.rot ?? 0) * Math.PI) / 180, c = Math.abs(Math.cos(a)), n = Math.abs(Math.sin(a));
  const hw = (s.w * c + s.d * n) / 2, hd = (s.w * n + s.d * c) / 2;
  return { x0: it.x - hw, x1: it.x + hw, y0: it.y - hd, y1: it.y + hd, s };
}

const overlaps = (f, r) => f.x0 < r.x1 && f.x1 > r.x0 && f.y0 < r.y1 && f.y1 > r.y0;

function containsPoint(it, [px, py]) {
  const s = spec(it);
  const a = (-(it.rot ?? 0) * Math.PI) / 180;
  const dx = px - it.x, dy = py - it.y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= s.w / 2 && Math.abs(ly) <= s.d / 2;
}

export function checkLayout(room, items, options = {}) {
  const out = [];
  const segs = segments(room);
  const zones = [];
  for (const seg of segs) {
    for (const o of seg.openings) {
      const depth = o.type === 'window' ? 24 : o.type === 'closet' ? 15 : o.to - o.from;
      const p0 = along(seg, o.from, 0), p1 = along(seg, o.to, -depth);
      const r = { x0: Math.min(p0[0], p1[0]), x1: Math.max(p0[0], p1[0]), y0: Math.min(p0[1], p1[1]), y1: Math.max(p0[1], p1[1]) };
      if (o.type === 'window') zones.push({ r, text: 'is in front of the egress window. Anything taller than the sill there blocks the way out.', tall: o.sill - 6, window: true });
      if (o.type === 'door') zones.push({ r, text: `is in the ${o.id === 'entry' ? 'entry' : 'side'} door's swing.`, tall: 0 });
      if (o.type === 'closet' && options.closetDoors !== false) zones.push({ r, text: 'is where the closet doors fold open.', tall: 0 });
    }
  }
  for (const it of items) {
    const f = footprint(it);
    const name = f.s.short ?? f.s.name;
    const hanging = OVERHEAD.has(f.s.shape) && f.s.z >= 50;
    const onWall = OVERHEAD.has(f.s.shape) && f.s.z > 0;
    if (!pointInRoom(room, it.x, it.y)) out.push({ id: it.id, text: `${name} is outside the walls.` });
    const flatPiece = hanging || f.s.shape === 'rug' || f.s.shape === 'roundRug' || f.s.h < 1;
    for (const z of flatPiece ? [] : zones) {
      if (onWall && !z.window) continue;
      if (overlaps(f, z.r) && f.s.z + f.s.h > z.tall) out.push({ id: it.id, text: `${name} ${z.text}` });
    }
    if (room.closet?.cleanout && f.s.h >= 1 && !hanging && containsPoint(it, room.closet.cleanout)) {
      out.push({ id: it.id, text: `${name} covers the floor drain cover. Fine if it lifts out easily.` });
    }
  }
  return out;
}
