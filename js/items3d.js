import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { spec } from './catalog.js';

// Builds one piece as a group whose origin sits on the floor at the centre of its footprint.
// Local x = width, local z = depth with the back at -d/2, y = up.

const WARM = 0xffd9a0;
const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const glowMat = (color, s) => new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.25 + 0.55 * s });

function shade(color, k) {
  const c = new THREE.Color(color);
  const hsl = {};
  c.getHSL(hsl);
  return c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * k)));
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

function textureFromCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rugTexture(color, accent, round) {
  return textureFromCanvas(256, 256, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = accent;
    if (round) {
      for (const r of [118, 104, 60]) { g.lineWidth = r === 104 ? 3 : 7; g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
    } else {
      g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
      g.lineWidth = 3; g.strokeRect(34, 34, w - 68, h - 68);
      g.fillStyle = accent;
      for (let i = 0; i < 5; i++) { g.save(); g.translate(128, 60 + i * 34); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore(); }
    }
  });
}

function fabricTexture(color) {
  return textureFromCanvas(128, 16, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const grad = g.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.10)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.10)');
      grad.addColorStop(1, 'rgba(0,0,0,0.10)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 16, h);
    }
  });
}

const BOOKS = ['#8c4f3f', '#3f5a6b', '#c9a66b', '#6b7d5a', '#a64d5e', '#e3d9c6', '#4a4a52', '#b8763e'];

function books(g, width, y, depth, zBack, seed) {
  let x = -width / 2 + 1;
  let i = seed;
  while (x < width / 2 - 3) {
    i = (i * 7 + 3) % 97;
    const bw = 1 + (i % 3) * 0.6, bh = 7 + (i % 4);
    if (i % 11 === 0) { x += 3; continue; }
    g.add(mesh(new THREE.BoxGeometry(bw, bh, depth * 0.75), mat(BOOKS[i % BOOKS.length]), x + bw / 2, y + bh / 2, zBack + depth * 0.45));
    x += bw + 0.15;
    if (x > width * 0.3 && i % 5 === 0) break;
  }
}

const BUILD = {
  box(s) {
    return [mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mat(s.color), 0, s.h / 2)];
  },
  cushion(s) {
    const r = Math.min(2.2, s.h / 2 - 0.01);
    return [mesh(new RoundedBoxGeometry(s.w, s.h, s.d, 3, r), mat(s.color), 0, s.h / 2)];
  },
  roundCushion(s) {
    const r = s.w / 2;
    return [
      mesh(new THREE.CylinderGeometry(r * 0.94, r, s.h, 28), mat(s.color), 0, s.h / 2),
      mesh(new THREE.SphereGeometry(0.8, 8, 6), mat(shade(s.color, 0.7)), 0, s.h, 0),
    ];
  },
  zafu(s) {
    const r = s.w / 2;
    const m = mesh(new THREE.CylinderGeometry(r * 0.88, r, s.h, 24), mat(s.color), 0, s.h / 2);
    const band = mesh(new THREE.TorusGeometry(r * 0.97, 0.6, 6, 24), mat(shade(s.color, 0.8)), 0, s.h * 0.35);
    band.rotation.x = Math.PI / 2;
    return [m, band];
  },
  pouf(s) {
    const m = mesh(new THREE.SphereGeometry(1, 24, 14), mat(s.color), 0, s.h / 2);
    m.scale.set(s.w / 2, s.h / 2, s.d / 2);
    return [m];
  },
  beanbag(s) {
    const m = mesh(new THREE.SphereGeometry(1, 24, 14), mat(s.color), 0, s.h * 0.42);
    m.scale.set(s.w / 2, s.h * 0.5, s.d / 2);
    const dip = mesh(new THREE.SphereGeometry(1, 16, 10), mat(shade(s.color, 0.85)), 0, s.h * 0.62, s.d * 0.1);
    dip.scale.set(s.w * 0.3, s.h * 0.2, s.d * 0.28);
    return [m, dip];
  },
  bolster(s) {
    const m = mesh(new THREE.CylinderGeometry(s.h / 2, s.h / 2, s.w, 20), mat(s.color), 0, s.h / 2);
    m.rotation.z = Math.PI / 2;
    return [m];
  },
  pillow(s) {
    const m = mesh(new RoundedBoxGeometry(s.w, s.h, s.d, 3, 2.5), mat(s.color), 0, s.h / 2 - 1, 0);
    m.rotation.x = -0.25;
    return [m];
  },
  lounger(s) {
    const base = 5;
    const seat = mesh(new RoundedBoxGeometry(s.w, base, s.d, 3, 2), mat(s.color), 0, base / 2);
    const back = mesh(new RoundedBoxGeometry(s.w, s.h - base, 7, 3, 2.5), mat(shade(s.color, 0.92)), 0, base + (s.h - base) / 2 - 1, -s.d / 2 + 5);
    back.rotation.x = -0.3;
    return [seat, back];
  },
  rug(s) {
    const tex = rugTexture(s.color, s.accent ?? shade(s.color, 0.7).getStyle(), false);
    return [mesh(new THREE.BoxGeometry(s.w, s.h, s.d), [mat(s.color), mat(s.color), new THREE.MeshLambertMaterial({ map: tex }), mat(s.color), mat(s.color), mat(s.color)], 0, s.h / 2)];
  },
  roundRug(s) {
    const tex = rugTexture(s.color, s.accent ?? shade(s.color, 0.7).getStyle(), true);
    return [mesh(new THREE.CylinderGeometry(s.w / 2, s.w / 2, s.h, 48), [mat(s.color), new THREE.MeshLambertMaterial({ map: tex }), mat(s.color)], 0, s.h / 2)];
  },
  sheepskin(s) {
    const shape = new THREE.Shape();
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(a * 5);
      const p = [Math.cos(a) * s.w / 2 * wob, Math.sin(a) * s.d / 2 * wob];
      i ? shape.lineTo(...p) : shape.moveTo(...p);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: s.h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return [mesh(geo, mat(s.color))];
  },
  table(s) {
    const t = 1.2, leg = 1.6;
    const out = [mesh(new THREE.BoxGeometry(s.w, t, s.d), mat(s.color), 0, s.h - t / 2)];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      out.push(mesh(new THREE.BoxGeometry(leg, s.h - t, leg), mat(shade(s.color, 0.85)), sx * (s.w / 2 - 2), (s.h - t) / 2, sz * (s.d / 2 - 2)));
    }
    return out;
  },
  roundTable(s) {
    return [
      mesh(new THREE.CylinderGeometry(s.w / 2, s.w / 2, 1.2, 28), mat(s.color), 0, s.h - 0.6),
      mesh(new THREE.CylinderGeometry(1, 1, s.h - 1.2, 10), mat(shade(s.color, 0.8)), 0, (s.h - 1.2) / 2),
      mesh(new THREE.CylinderGeometry(s.w / 3, s.w / 3, 0.8, 20), mat(shade(s.color, 0.8)), 0, 0.4),
    ];
  },
  altar(s) {
    const out = BUILD.table(s);
    out.push(mesh(new THREE.CylinderGeometry(3, 2, 2, 16), mat('#b8a07a'), -s.w / 4, s.h + 1, 0));
    for (const [x, hh] of [[s.w / 5, 4], [s.w / 5 + 2.5, 3]]) {
      out.push(mesh(new THREE.CylinderGeometry(0.9, 0.9, hh, 12), glowMat('#f4ecdc', 0.3), x, s.h + hh / 2, 0));
    }
    return out;
  },
  shelf(s) {
    const t = 0.8, c = mat(s.color), out = [];
    out.push(mesh(new THREE.BoxGeometry(t, s.h, s.d), c, -s.w / 2 + t / 2, s.h / 2));
    out.push(mesh(new THREE.BoxGeometry(t, s.h, s.d), c, s.w / 2 - t / 2, s.h / 2));
    out.push(mesh(new THREE.BoxGeometry(s.w, s.h, 0.3), mat(shade(s.color, 0.9)), 0, s.h / 2, -s.d / 2 + 0.15));
    const n = Math.max(2, Math.round(s.h / 13));
    const g = new THREE.Group();
    for (let i = 0; i <= n; i++) {
      const y = (i * (s.h - t)) / n;
      out.push(mesh(new THREE.BoxGeometry(s.w, t, s.d), c, 0, y + t / 2));
      if (i < n) books(g, s.w - 2 * t, y + t, s.d, -s.d / 2, i * 13 + Math.round(s.w));
    }
    out.push(g);
    return out;
  },
  cubes(s) {
    const t = 0.8, c = mat(s.color), out = [];
    for (const x of [-s.w / 2 + t / 2, 0, s.w / 2 - t / 2]) out.push(mesh(new THREE.BoxGeometry(t, s.h, s.d), c, x, s.h / 2));
    for (const y of [t / 2, s.h / 2, s.h - t / 2]) out.push(mesh(new THREE.BoxGeometry(s.w, t, s.d), c, 0, y));
    out.push(mesh(new THREE.BoxGeometry(s.w, s.h, 0.3), mat(shade(s.color, 0.9)), 0, s.h / 2, -s.d / 2 + 0.15));
    const bin = mat('#9a8468');
    out.push(mesh(new THREE.BoxGeometry(s.w / 2 - 2.5, s.h / 2 - 2.5, s.d - 2), bin, -s.w / 4, s.h / 4, 0.5));
    const g = new THREE.Group();
    books(g, s.w / 2 - 2, s.h / 2 + t / 2, s.d, -s.d / 2, 5);
    g.position.x = s.w / 4;
    out.push(g);
    return out;
  },
  ledge(s) {
    const out = [mesh(new THREE.BoxGeometry(s.w, 1, s.d), mat(s.color), 0, 0.5, 0),
      mesh(new THREE.BoxGeometry(s.w, 1.8, 0.5), mat(s.color), 0, 1.4, s.d / 2 - 0.25)];
    const g = new THREE.Group();
    books(g, s.w - 4, 1, 3, -s.d / 2 + 0.5, 3);
    out.push(g);
    return out;
  },
  basket(s) {
    return [
      mesh(new THREE.CylinderGeometry(s.w / 2, s.w / 2 * 0.88, s.h, 24, 1, true), mat(s.color, { side: THREE.DoubleSide }), 0, s.h / 2),
      mesh(new THREE.CylinderGeometry(s.w / 2 * 0.88, s.w / 2 * 0.88, 0.5, 24), mat(s.color), 0, 0.25),
      mesh(new THREE.SphereGeometry(s.w * 0.42, 16, 10), mat('#d9c9b0'), 0, s.h - 1, 0),
    ];
  },
  lamp(s) {
    const shadeH = Math.min(12, s.h * 0.3), r = s.w / 2;
    const dark = mat('#3a3733');
    return [
      mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.6, 1, 20), dark, 0, 0.5),
      mesh(new THREE.CylinderGeometry(0.45, 0.45, s.h - shadeH, 8), dark, 0, (s.h - shadeH) / 2),
      mesh(new THREE.CylinderGeometry(r * 0.7, r, shadeH, 24, 1, true), glowMat(s.color, s.glow ?? 1), 0, s.h - shadeH / 2),
    ];
  },
  saltLamp(s) {
    const m = mesh(new THREE.DodecahedronGeometry(1, 0), glowMat(s.color, 0.5), 0, s.h * 0.55);
    m.scale.set(s.w / 2, s.h / 2, s.d / 2);
    return [m, mesh(new THREE.CylinderGeometry(s.w / 2, s.w / 2, 1.5, 12), mat('#5a4636'), 0, 0.75)];
  },
  candles(s) {
    const out = [];
    for (const [x, z, hh] of [[-2, 1, 6], [1.5, -1.5, 4.5], [2, 2, 3]]) {
      out.push(mesh(new THREE.CylinderGeometry(1.2, 1.2, hh, 14), glowMat(s.color, 0.2), x, hh / 2, z));
      out.push(mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ color: WARM }), x, hh + 0.5, z));
    }
    return out;
  },
  lantern(s, ctx) {
    const cy = s.h / 2;
    const cord = ctx.ceiling - s.z - s.h;
    const out = [mesh(new THREE.SphereGeometry(s.w / 2, 24, 16), glowMat(s.color, s.glow ?? 1), 0, cy)];
    if (cord > 0) out.push(mesh(new THREE.CylinderGeometry(0.2, 0.2, cord, 6), mat('#3a3733'), 0, s.h + cord / 2));
    return out;
  },
  string(s) {
    const out = [], n = Math.max(8, Math.round(s.w / 4));
    const bulb = new THREE.MeshBasicMaterial({ color: s.color });
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = -s.w / 2 + (i * s.w) / n;
      const sag = -4 * Math.sin((Math.PI * i) / n);
      pts.push(new THREE.Vector3(x, sag, 0));
      out.push(mesh(new THREE.SphereGeometry(0.55, 8, 6), bulb, x, sag - 0.6, 0));
    }
    out.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x4a463f })));
    return out;
  },
  canopy(s) {
    const cloth = new THREE.MeshLambertMaterial({ color: s.color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    return [
      mesh(new THREE.CylinderGeometry(3, s.w / 2, s.h, 32, 1, true), cloth, 0, s.h / 2),
      mesh(new THREE.TorusGeometry(3, 0.4, 6, 16), mat('#b8a07a'), 0, s.h, 0),
    ];
  },
  curtain(s) {
    const tex = fabricTexture(s.color);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, s.w / 12), 1);
    return [
      mesh(new THREE.BoxGeometry(s.w, s.h, 0.6), new THREE.MeshLambertMaterial({ map: tex }), 0, s.h / 2, 0),
      mesh(new THREE.CylinderGeometry(0.5, 0.5, s.w + 6, 8), mat('#3a3733'), 0, s.h + 1, 0).rotateZ(Math.PI / 2),
    ];
  },
  panel(s) {
    return [mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mat(s.color), 0, s.h / 2, -s.d / 2 + s.d / 2)];
  },
  frame(s) {
    return [
      mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mat('#3a3733'), 0, s.h / 2),
      mesh(new THREE.BoxGeometry(s.w - 4, s.h - 4, 0.2), mat(s.color), 0, s.h / 2, s.d / 2 + 0.1),
      mesh(new THREE.BoxGeometry(s.w - 10, s.h - 12, 0.2), mat(shade(s.color, 0.7)), 0, s.h / 2 + 1, s.d / 2 + 0.2),
    ];
  },
  mirror(s) {
    return [
      mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mat('#b8a07a'), 0, s.h / 2),
      mesh(new THREE.BoxGeometry(s.w - 2, s.h - 2, 0.2), new THREE.MeshPhongMaterial({ color: s.color, shininess: 120, specular: 0xffffff }), 0, s.h / 2, s.d / 2 + 0.1),
    ];
  },
  divider(s) {
    const out = [], pw = s.w / 3;
    const tex = fabricTexture(s.color);
    for (let i = 0; i < 3; i++) {
      const p = mesh(new THREE.BoxGeometry(pw, s.h, 1), new THREE.MeshLambertMaterial({ map: tex }), (i - 1) * pw * 0.94, s.h / 2 + 1, i === 1 ? -s.d / 4 : s.d / 4);
      p.rotation.y = i === 1 ? 0 : (i === 0 ? 0.45 : -0.45);
      out.push(p);
    }
    return out;
  },
  plant(s) {
    const potH = Math.min(12, s.h * 0.28), potR = s.w * 0.28;
    const out = [mesh(new THREE.CylinderGeometry(potR, potR * 0.8, potH, 18), mat('#c98a64'), 0, potH / 2)];
    const leaf = mat(s.color), leaf2 = mat(shade(s.color, 1.2));
    const tall = s.h > 30;
    if (tall) out.push(mesh(new THREE.CylinderGeometry(0.6, 0.8, s.h * 0.6, 6), mat('#6b5443'), 0, potH + s.h * 0.3));
    const n = tall ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, rr = s.w * (tall ? 0.28 : 0.22);
      const y = tall ? potH + s.h * 0.35 + (i / n) * s.h * 0.55 : potH + s.h * 0.25 + (i % 2) * 2;
      const m = mesh(new THREE.IcosahedronGeometry(tall ? s.w * 0.22 : s.w * 0.28, 0), i % 2 ? leaf : leaf2, Math.cos(a) * rr, Math.min(y, s.h - 3), Math.sin(a) * rr);
      m.scale.y = 0.8;
      out.push(m);
    }
    return out;
  },
  hangingPlant(s, ctx) {
    const potH = 6, top = s.h;
    const cord = ctx.ceiling - s.z - top;
    const out = [mesh(new THREE.CylinderGeometry(s.w * 0.35, s.w * 0.28, potH, 16), mat('#e8e1d6'), 0, top - potH / 2)];
    if (cord > 0) out.push(mesh(new THREE.CylinderGeometry(0.15, 0.15, cord, 5), mat('#8a7a66'), 0, top + cord / 2));
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, len = s.h * (0.5 + (i % 3) * 0.2);
      const v = mesh(new THREE.ConeGeometry(1.6, len, 5), mat(i % 2 ? s.color : shade(s.color, 1.2)), Math.cos(a) * s.w * 0.3, top - potH - len / 2 + 3, Math.sin(a) * s.w * 0.3);
      v.rotation.x = Math.PI;
      out.push(v);
    }
    return out;
  },
};

function stripeTexture(color) {
  return textureFromCanvas(8, 64, (g, w, h) => {
    const base = new THREE.Color(color);
    const cols = [base.getStyle(), shade(color, 0.8).getStyle(), shade(color, 1.12).getStyle(), shade(color, 0.65).getStyle()];
    for (let y = 0; y < h; y += 8) { g.fillStyle = cols[(y / 8) % cols.length]; g.fillRect(0, y, w, 8); }
  });
}

// A sagging fabric body from -len/2 to len/2, ends at yEnd, lowest point yLow.
function hammockBody(len, width, yEnd, yLow, color) {
  const N = 28, M = 8, pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, sn = Math.sin(Math.PI * t);
    const yc = yEnd - (yEnd - yLow) * sn, hw = (width / 2) * Math.pow(sn, 0.55) + 0.6;
    for (let j = 0; j <= M; j++) {
      const v = (j / M) * 2 - 1;
      pos.push(-len / 2 + t * len, yc + v * v * 5 * sn, v * hw);
      uv.push(t, j / M);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * (M + 1) + j, b = a + M + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: stripeTexture(color), side: THREE.DoubleSide }));
}

function rope(a, b, color = 0x8a7a66, r = 0.35) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat(color));
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return m;
}

Object.assign(BUILD, {
  hammock(s) {
    const L = s.w * 0.72, yEnd = s.h - ((s.w - L) / 2) * 0.55;
    const out = [hammockBody(L, s.d, yEnd, 16, s.color)];
    for (const sx of [-1, 1]) {
      out.push(rope([sx * s.w / 2, s.h, 0], [sx * L / 2, yEnd, 0]));
      out.push(mesh(new THREE.BoxGeometry(2.5, 3, 2.5), mat('#6b5443'), sx * s.w / 2, s.h, 0));
    }
    return out;
  },
  hammockStand(s) {
    const wood = mat(s.color), out = [];
    out.push(mesh(new THREE.BoxGeometry(s.w * 0.7, 2.5, 3), wood, 0, 1.25, 0));
    for (const sx of [-1, 1]) {
      out.push(mesh(new THREE.BoxGeometry(3, 2.5, s.d * 0.8), wood, sx * s.w * 0.35, 1.25, 0));
      out.push(rope([sx * s.w * 0.35, 0, 0], [sx * s.w / 2, s.h, 0], s.color, 1.4));
    }
    const L = s.w * 0.78, yEnd = s.h - 4;
    out.push(hammockBody(L, 38, yEnd, 14, '#e3d6c2'));
    for (const sx of [-1, 1]) out.push(rope([sx * s.w / 2, s.h, 0], [sx * L / 2, yEnd, 0]));
    return out;
  },
  hangingChair(s, ctx) {
    const podH = s.h * 0.5, wick = new THREE.MeshLambertMaterial({ color: s.color, side: THREE.DoubleSide });
    const out = [
      mesh(new THREE.CylinderGeometry(s.w / 2, s.w * 0.3, podH, 28, 1, true, Math.PI * 0.3, Math.PI * 1.4), wick, 0, podH / 2),
      mesh(new THREE.CylinderGeometry(s.w * 0.3, s.w * 0.3, 1, 24), wick, 0, 0.5),
      mesh(new THREE.CylinderGeometry(s.w * 0.36, s.w * 0.33, 3.5, 24), mat('#efe8dc'), 0, 3),
      mesh(new RoundedBoxGeometry(s.w * 0.45, 12, 5, 3, 2), mat('#c9a66b'), 0, 11, -s.w * 0.3),
    ];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.55 + i * (Math.PI * 0.9 / 3);
      out.push(rope([Math.sin(a) * s.w / 2 * 0.95, podH, Math.cos(a) * s.w / 2 * 0.95], [0, s.h, 0]));
    }
    const chain = ctx.ceiling - s.z - s.h;
    if (chain > 0) out.push(rope([0, s.h, 0], [0, s.h + chain, 0], 0x3a3733, 0.3));
    return out;
  },
  armchair(s) {
    const fab = mat(s.color), dark = mat(shade(s.color, 0.8)), out = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(mesh(new THREE.CylinderGeometry(0.8, 0.6, 4, 8), mat('#3a3733'), sx * (s.w / 2 - 3), 2, sz * (s.d / 2 - 3)));
    out.push(mesh(new RoundedBoxGeometry(s.w, 13, s.d, 3, 2.5), fab, 0, 10.5, 0));
    const back = mesh(new RoundedBoxGeometry(s.w - 2, s.h - 12, 8, 3, 3), dark, 0, 12 + (s.h - 12) / 2, -s.d / 2 + 4.5);
    back.rotation.x = -0.12;
    out.push(back);
    for (const sx of [-1, 1]) out.push(mesh(new RoundedBoxGeometry(5, 20, s.d - 2, 3, 2), dark, sx * (s.w / 2 - 2.5), 14, 0));
    return out;
  },
  sconce(s) {
    return [
      mesh(new THREE.BoxGeometry(4, 6, 0.8), mat('#3a3733'), 0, s.h * 0.55, -s.d / 2 + 0.4),
      rope([0, s.h * 0.6, -s.d / 2 + 0.8], [0, s.h * 0.75, s.d / 2 - 4], 0x3a3733, 0.35),
      mesh(new THREE.CylinderGeometry(2.8, 3.8, 6, 20, 1, true), glowMat(s.color, s.glow ?? 0.6), 0, s.h * 0.5, s.d / 2 - 4),
    ];
  },
  ladderShelf(s) {
    const wood = mat(s.color), out = [];
    const tilt = -Math.atan2(s.d - 1, s.h), len = Math.hypot(s.d - 1, s.h);
    for (const sx of [-1, 1]) {
      const r = mesh(new THREE.BoxGeometry(1.5, len, 1.5), wood, sx * (s.w / 2 - 0.75), s.h / 2, 0.5);
      r.rotation.x = tilt;
      out.push(r);
    }
    [0.14, 0.4, 0.64, 0.86].forEach((f, i) => {
      const y = s.h * f, depth = (s.d - 1) * (1 - f) + 2.5;
      out.push(mesh(new THREE.BoxGeometry(s.w - 3, 0.8, depth), wood, 0, y, -s.d / 2 + depth / 2));
      if (i % 2 === 0) {
        out.push(mesh(new THREE.CylinderGeometry(2.2, 1.8, 4, 12), mat('#c98a64'), -s.w / 4, y + 2.4, -s.d / 2 + depth / 2));
        out.push(mesh(new THREE.IcosahedronGeometry(3, 0), mat('#5b8a52'), -s.w / 4, y + 6.5, -s.d / 2 + depth / 2));
      } else {
        const g = new THREE.Group();
        books(g, s.w * 0.5, y + 0.4, depth - 0.5, -s.d / 2 + 0.3, i * 9);
        g.position.x = s.w * 0.15;
        out.push(g);
      }
    });
    return out;
  },
});

export function buildItem(item, ctx) {
  const s = spec(item);
  const g = new THREE.Group();
  const parts = (BUILD[s.shape] ?? BUILD.box)(s, ctx);
  for (const p of parts) g.add(p);
  g.position.set(item.x, s.z, item.y);
  g.rotation.y = (-(item.rot ?? 0) * Math.PI) / 180;
  g.userData = { id: item.id };
  let light = null;
  if (s.glow) {
    light = new THREE.PointLight(WARM, 0, 0, 1.4);
    light.position.set(0, s.shape === 'lamp' ? s.h - Math.min(12, s.h * 0.3) / 2 : s.shape === 'string' ? -2 : s.h / 2, 0);
    light.userData.glow = s.glow;
    g.add(light);
  }
  return { group: g, light };
}
