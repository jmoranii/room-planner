import * as THREE from 'three';
import { segments, along, add, wallPieces } from './geometry.js';

const COLOR = {
  wall: 0xdad5cd, trim: 0xf7f6f3, ceiling: 0xefece7, door: 0xf4f3f0, post: 0xe9e5de,
  glass: 0xd3e6f3, frame: 0xfbfbfa, metal: 0xa7aeb2, gravel: 0x8e887e, unit: 0xfcfcfb,
  edge: 0x837d74, cleanout: 0xc9c3ba, light: 0xfff6df,
};

// Axis-aligned box between two plan points, from height z0 to z1.
function planBox(p, q, z0, z1, mat) {
  const x0 = Math.min(p[0], q[0]), x1 = Math.max(p[0], q[0]);
  const y0 = Math.min(p[1], q[1]), y1 = Math.max(p[1], q[1]);
  const geo = new THREE.BoxGeometry(Math.max(x1 - x0, 0.05), z1 - z0, Math.max(y1 - y0, 0.05));
  const m = new THREE.Mesh(geo, mat);
  m.position.set((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2);
  return m;
}

function edged(mesh, edgeMat) {
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat));
  return mesh;
}

// Flat shape in plan coordinates, laid on the floor plane at height z.
function flat(points, z, mat) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, -y)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = z;
  return m;
}

const rectPts = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// 96-inch tile of 8-inch-wide, 48-inch-long planks running east-west.
function plankTexture() {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tex = canvasTexture(1024, 1024, (g, S) => {
    const inch = S / 96;
    for (let r = 0; r < 12; r++) {
      const off = ((r * 29) % 48) * inch;
      for (let k = -1; k < 3; k++) {
        const v = Math.round((rand() - 0.5) * 18);
        g.fillStyle = `rgb(${176 + v},${163 + v},${148 + v})`;
        g.fillRect(off + k * 48 * inch, r * 8 * inch, 48 * inch, 8 * inch);
        g.strokeStyle = 'rgba(70,58,45,0.35)';
        g.lineWidth = 2;
        g.strokeRect(off + k * 48 * inch, r * 8 * inch, 48 * inch, 8 * inch);
        g.strokeStyle = 'rgba(90,75,60,0.10)';
        g.lineWidth = 1;
        for (let l = 0; l < 5; l++) {
          const y = r * 8 * inch + rand() * 8 * inch;
          g.beginPath();
          g.moveTo(off + k * 48 * inch, y);
          g.bezierCurveTo(off + (k * 48 + 16) * inch, y + 4, off + (k * 48 + 32) * inch, y - 4, off + (k + 1) * 48 * inch, y);
          g.stroke();
        }
      }
    }
  });
  tex.repeat.set(1 / 96, 1 / 96);
  tex.anisotropy = 8;
  return tex;
}

function louverTexture() {
  return canvasTexture(64, 256, (g, w, h) => {
    g.fillStyle = '#f4f3f0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9d6d0';
    for (let y = 6; y < h - 6; y += 6) g.fillRect(6, y, w - 12, 2);
    g.fillStyle = '#f4f3f0';
    g.fillRect(6, h * 0.5 - 6, w - 12, 12);
  });
}

// Each wall gets its own materials so it can fade independently.
function wallMaterials(shared) {
  return {
    wall: new THREE.MeshLambertMaterial({ color: COLOR.wall }),
    trim: new THREE.MeshLambertMaterial({ color: COLOR.trim }),
    unit: new THREE.MeshLambertMaterial({ color: COLOR.unit }),
    glass: new THREE.MeshBasicMaterial({ color: COLOR.glass }),
    metal: new THREE.MeshLambertMaterial({ color: COLOR.metal, side: THREE.DoubleSide }),
    gravel: new THREE.MeshLambertMaterial({ color: COLOR.gravel }),
    louver: new THREE.MeshLambertMaterial({ map: shared.louver }),
    floor: new THREE.MeshLambertMaterial({ map: shared.planks }),
    edge: new THREE.LineBasicMaterial({ color: COLOR.edge, transparent: true, opacity: 0.45 }),
  };
}

function casing(seg, o, g, m) {
  const w = o.type === 'window' ? 3 : 2.5, d = -0.75;
  const bottom = o.sill ? o.sill - 1 : 0;
  g.add(planBox(along(seg, o.from - w, d), along(seg, o.from, 0), bottom, o.head + w, m.trim));
  g.add(planBox(along(seg, o.to, d), along(seg, o.to + w, 0), bottom, o.head + w, m.trim));
  g.add(planBox(along(seg, o.from - w, d), along(seg, o.to + w, 0), o.head, o.head + w, m.trim));
  if (o.sill) g.add(planBox(along(seg, o.from - w, -1.5), along(seg, o.to + w, 0), o.sill - 1, o.sill, m.trim));
}

function windowUnit(seg, o, g, m) {
  const d0 = seg.t - 2.5, d1 = seg.t - 1, f = 2;
  const frame = (s0, s1, z0, z1) => g.add(planBox(along(seg, s0, d0), along(seg, s1, d1), z0, z1, m.trim));
  frame(o.from, o.from + f, o.sill, o.head);
  frame(o.to - f, o.to, o.sill, o.head);
  frame(o.from, o.to, o.sill, o.sill + f);
  frame(o.from, o.to, o.head - f, o.head);
  const mid = (o.from + o.to) / 2;
  frame(mid - 0.75, mid + 0.75, o.sill, o.head);
  g.add(planBox(along(seg, o.from, seg.t - 1.8), along(seg, o.to, seg.t - 1.6), o.sill, o.head, m.glass));
}

function egressWell(room, segs, g, m) {
  const w = room.egressWell;
  if (!w) return;
  const seg = segs[w.wall];
  const c = along(seg, w.center, seg.t);
  const top = room.ceiling + 8;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, top - w.floor, 28, 1, true, Math.PI / 2, Math.PI), m.metal);
  shell.scale.set(w.halfWidth, 1, w.depth);
  shell.position.set(c[0], (w.floor + top) / 2, c[1]);
  g.add(shell);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (Math.PI * i) / 24;
    pts.push([c[0] + w.halfWidth * Math.cos(a), c[1] - w.depth * Math.sin(a)]);
  }
  g.add(flat(pts, w.floor, m.gravel));
}

function door(seg, o, mat) {
  const w = o.to - o.from;
  if (o.state === 'closed') {
    return planBox(along(seg, o.from, seg.t / 2 - 0.7), along(seg, o.to, seg.t / 2 + 0.7), 0.5, o.head - 0.5, mat);
  }
  const hingeAt = o.hinge === 'to' ? o.to : o.from;
  const toward = o.hinge === 'to' ? [-seg.dir[0], -seg.dir[1]] : seg.dir;
  const h = along(seg, hingeAt, 0);
  return planBox(h, add(add(h, seg.nIn, w - 1), toward, 1.4), 0.5, o.head - 0.5, mat);
}

function bifold(seg, o, g, m) {
  const leaf = (at, toward) => {
    const p = along(seg, at, 0);
    g.add(planBox(p, add(add(p, seg.nIn, 15), toward, 2.4), 0.5, o.head - 1, m.louver));
  };
  leaf(o.from, seg.dir);
  leaf(o.to, [-seg.dir[0], -seg.dir[1]]);
}

function closetBox(room, g, m) {
  const c = room.closet, H = room.ceiling, x0 = room.outline[1][0];
  g.add(edged(planBox([c.x0, c.y0 - c.t], [c.x1 + c.t, c.y0], 0, H, m.wall), m.edge));
  g.add(edged(planBox([c.x0, c.y1], [c.x1 + c.t, c.y1 + c.t], 0, H, m.wall), m.edge));
  g.add(edged(planBox([c.x1, c.y0], [c.x1 + c.t, c.y1], 0, H, m.wall), m.edge));
  g.add(flat(rectPts(x0, c.y0, c.x1, c.y1), 0, m.floor));
  const cleanout = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.3, 20), new THREE.MeshLambertMaterial({ color: COLOR.cleanout }));
  cleanout.position.set(c.cleanout[0], 0.15, c.cleanout[1]);
  g.add(cleanout);
  g.add(planBox([c.x1 - 0.3, c.outlet - 1.4], [c.x1, c.outlet + 1.4], 14, 18.5, m.trim));
}

function wallItem(seg, it, g, m) {
  if (it.type === 'outlet' || it.type === 'switch') {
    const z = it.type === 'outlet' ? 14 : 46;
    g.add(planBox(along(seg, it.at - 1.4, -0.3), along(seg, it.at + 1.4, 0), z, z + 4.5, m.trim));
  } else {
    g.add(edged(planBox(along(seg, it.from, -it.depth), along(seg, it.to, 0), it.z0, it.z1, m.unit), m.edge));
  }
}

export function buildRoom(room) {
  const root = new THREE.Group();
  const segs = segments(room);
  const H = room.ceiling;
  const shared = { planks: plankTexture(), louver: louverTexture() };
  const fadeGroups = [];

  segs.forEach((seg, i) => {
    const g = new THREE.Group();
    const m = wallMaterials(shared);
    g.userData = { nOut: seg.nOut, mid: along(seg, seg.len / 2) };
    for (const p of wallPieces(seg, H)) {
      g.add(edged(planBox(along(seg, p.s0, 0), along(seg, p.s1, seg.t), p.z0, p.z1, m.wall), m.edge));
      if (p.z0 === 0) g.add(planBox(along(seg, p.s0, -0.6), along(seg, p.s1, 0), 0, 4.5, m.trim));
    }
    const next = segs[(i + 1) % segs.length];
    g.add(planBox(seg.b, add(add(seg.b, seg.nOut, seg.t), next.nOut, next.t), 0, H, m.wall));
    for (const o of seg.openings) {
      casing(seg, o, g, m);
      if (o.type === 'window') windowUnit(seg, o, g, m);
      if (o.type === 'closet') { bifold(seg, o, g, m); closetBox(room, g, m); }
    }
    if (room.egressWell?.wall === i) egressWell(room, segs, g, m);
    for (const it of room.wallItems.filter(w => w.wall === i)) wallItem(seg, it, g, m);
    root.add(g);
    fadeGroups.push(g);
  });

  const floorMat = new THREE.MeshLambertMaterial({ map: shared.planks });
  root.add(flat(room.outline, 0, floorMat));

  const doorMat = new THREE.MeshLambertMaterial({ color: COLOR.door });
  const edgeMat = new THREE.LineBasicMaterial({ color: COLOR.edge, transparent: true, opacity: 0.45 });
  for (const seg of segs) for (const o of seg.openings) if (o.type === 'door') root.add(edged(door(seg, o, doorMat), edgeMat));

  const b = room.beam, p = room.post;
  const beamY1 = room.outline.reduce((mx, pt) => Math.max(mx, pt[1]), 0);
  root.add(edged(planBox([b.x0, 0], [b.x1, beamY1], b.bottom, H, new THREE.MeshLambertMaterial({ color: COLOR.post })), edgeMat));
  root.add(edged(planBox([p.x0, p.y0], [p.x1, p.y1], 0, b.bottom, new THREE.MeshLambertMaterial({ color: COLOR.post })), edgeMat));
  root.add(planBox([p.x0 - 1, p.y0 - 1], [p.x1 + 1, p.y1 + 1], 0, 6, new THREE.MeshLambertMaterial({ color: COLOR.trim })));

  const ceiling = new THREE.Group();
  const ceilMat = new THREE.MeshLambertMaterial({ color: COLOR.ceiling, emissive: 0x4a4740, side: THREE.DoubleSide });
  ceiling.add(flat(room.outline, H, ceilMat));
  if (room.closet) ceiling.add(flat(rectPts(room.outline[1][0], room.closet.y0, room.closet.x1, room.closet.y1), H, ceilMat));
  const lightMat = new THREE.MeshBasicMaterial({ color: COLOR.light });
  for (const [x, y] of room.lights) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 5, 3, 24), lightMat);
    l.position.set(x, H - 1.5, y);
    ceiling.add(l);
  }
  ceiling.visible = false;
  root.add(ceiling);

  return { root, fadeGroups, ceiling };
}

// Ghost the walls between the camera and the room so the inside stays visible.
export function setFaded(group, faded) {
  if (group.userData.faded === faded) return;
  group.userData.faded = faded;
  group.traverse(o => {
    if (!o.material) return;
    const base = o.isLineSegments ? 0.45 : 1;
    o.material.transparent = faded || o.isLineSegments;
    o.material.opacity = faded ? base * 0.12 : base;
    o.material.depthWrite = !faded;
    o.material.needsUpdate = true;
  });
}
