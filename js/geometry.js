// Shared room geometry. Plan coordinates are inches: x east, y south (screen-style),
// heights measured up from the floor. Outlines are axis-aligned and clockwise.

export function segments(room) {
  const pts = room.outline;
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const dir = [dx / len, dy / len];
    const nIn = [-dir[1], dir[0]];
    const nOut = [-nIn[0], -nIn[1]];
    const t = room.wallThickness?.[i] ?? 5;
    const openings = room.openings.filter(o => o.wall === i).sort((p, q) => p.from - q.from);
    return { i, a, b, len, dir, nIn, nOut, t, openings };
  });
}

// Point `s` inches along a wall, pushed `off` inches outward (negative = into the room).
export function along(seg, s, off = 0) {
  return [seg.a[0] + seg.dir[0] * s + seg.nOut[0] * off, seg.a[1] + seg.dir[1] * s + seg.nOut[1] * off];
}

export const add = (v, w, k = 1) => [v[0] + w[0] * k, v[1] + w[1] * k];

// Solid chunks of a wall once its openings are cut out.
export function wallPieces(seg, ceiling) {
  const out = [];
  let s = 0;
  for (const o of seg.openings) {
    if (o.from > s) out.push({ s0: s, s1: o.from, z0: 0, z1: ceiling });
    if (o.sill) out.push({ s0: o.from, s1: o.to, z0: 0, z1: o.sill, sill: true });
    if (o.head < ceiling) out.push({ s0: o.from, s1: o.to, z0: o.head, z1: ceiling, header: true });
    s = o.to;
  }
  if (s < seg.len) out.push({ s0: s, s1: seg.len, z0: 0, z1: ceiling });
  return out;
}

export function pointInRoom(room, x, y) {
  const c = room.closet;
  if (c && x >= room.outline[1][0] && x <= c.x1 && y >= c.y0 && y <= c.y1) return true;
  let inside = false;
  const p = room.outline;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
