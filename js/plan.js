import { segments, along, add, wallPieces } from './geometry.js';

const f = n => Math.round(n * 100) / 100;
const P = p => `${f(p[0])},${f(p[1])}`;

function rect(p, q, cls) {
  const x = Math.min(p[0], q[0]), y = Math.min(p[1], q[1]);
  return `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(Math.abs(q[0] - p[0]))}" height="${f(Math.abs(q[1] - p[1]))}"/>`;
}

const text = (x, y, s, cls = 'lbl', anchor = 'middle') =>
  `<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${s}</text>`;

function swing(seg, o) {
  const w = o.to - o.from;
  const hingeAt = o.hinge === 'to' ? o.to : o.from;
  const otherAt = o.hinge === 'to' ? o.from : o.to;
  const h = along(seg, hingeAt, 0), j = along(seg, otherAt, 0), tip = add(h, seg.nIn, w);
  const cross = (j[0] - h[0]) * (tip[1] - h[1]) - (j[1] - h[1]) * (tip[0] - h[0]);
  return `<path class="leaf" d="M${P(h)} L${P(tip)}"/>` +
    `<path class="swing" d="M${P(j)} A${w} ${w} 0 0 ${cross > 0 ? 1 : 0} ${P(tip)}"/>`;
}

function bifold(seg, o) {
  const a = along(seg, o.from, 0), b = along(seg, o.to, 0), w = o.to - o.from;
  const mid = along(seg, (o.from + o.to) / 2, 0);
  const k1 = add(along(seg, o.from + w / 4, 0), seg.nIn, 9);
  const k2 = add(along(seg, o.to - w / 4, 0), seg.nIn, 9);
  return `<path class="bifold" d="M${P(a)} L${P(k1)} L${P(mid)} L${P(k2)} L${P(b)}"/>`;
}

export function drawPlan(svg, room) {
  const segs = segments(room);
  const H = room.ceiling;
  const c = room.closet, x0 = room.outline[1][0];
  const out = [];

  out.push(`<polygon class="floor" points="${room.outline.map(P).join(' ')}"/>`);
  if (c) out.push(rect([x0, c.y0], [c.x1, c.y1], 'floor'));

  const w = room.egressWell;
  if (w) {
    const seg = segs[w.wall], ctr = along(seg, w.center, seg.t);
    out.push(`<path class="well" d="M${f(ctr[0] - w.halfWidth)},${f(ctr[1])} A${w.halfWidth} ${w.depth} 0 0 1 ${f(ctr[0] + w.halfWidth)},${f(ctr[1])}"/>`);
    out.push(text(ctr[0], ctr[1] - w.depth - 4, 'egress well', 'dim'));
  }

  const beamY1 = Math.max(...room.outline.map(p => p[1]));
  out.push(rect([room.beam.x0, 0], [room.beam.x1, beamY1], 'beam'));

  segs.forEach((seg, i) => {
    for (const p of wallPieces(seg, H)) {
      if (p.header) continue;
      out.push(rect(along(seg, p.s0, 0), along(seg, p.s1, seg.t), p.sill ? 'win' : 'wall'));
    }
    const next = segs[(i + 1) % segs.length];
    out.push(rect(seg.b, add(add(seg.b, seg.nOut, seg.t), next.nOut, next.t), 'wall'));
    for (const o of seg.openings) {
      if (o.type === 'window') out.push(`<path class="glass" d="M${P(along(seg, o.from, seg.t - 1.7))} L${P(along(seg, o.to, seg.t - 1.7))}"/>`);
      if (o.type === 'door') out.push(swing(seg, o));
      if (o.type === 'closet') out.push(bifold(seg, o));
    }
  });

  if (c) {
    out.push(rect([c.x0, c.y0 - c.t], [c.x1 + c.t, c.y0], 'wall'));
    out.push(rect([c.x0, c.y1], [c.x1 + c.t, c.y1 + c.t], 'wall'));
    out.push(rect([c.x1, c.y0], [c.x1 + c.t, c.y1], 'wall'));
    out.push(`<circle class="cleanout" cx="${c.cleanout[0]}" cy="${c.cleanout[1]}" r="2.5"/>`);
    out.push(`<circle class="outlet" cx="${c.x1 - 2}" cy="${c.outlet}" r="1.8"/>`);
  }

  const p = room.post;
  out.push(rect([p.x0, p.y0], [p.x1, p.y1], 'post'));

  for (const it of room.wallItems) {
    const seg = segs[it.wall];
    if (it.type === 'outlet') { const q = along(seg, it.at, -2); out.push(`<circle class="outlet" cx="${f(q[0])}" cy="${f(q[1])}" r="1.8"/>`); }
    else if (it.type === 'switch') { const q = along(seg, it.at, -2); out.push(rect([q[0] - 1.8, q[1] - 1.8], [q[0] + 1.8, q[1] + 1.8], 'switch')); }
    else out.push(rect(along(seg, it.from, 0), along(seg, it.to, -it.depth), it.type === 'minisplit' ? 'unit' : 'unit thin'));
  }
  for (const [x, y] of room.lights) out.push(`<circle class="light" cx="${x}" cy="${y}" r="6"/>`);

  // Labels and key dimensions (this room only; other rooms can add their own later).
  out.push(text(43, 128, 'Window side', 'lbl strong'), text(43, 137, 'about 7′3″ × 14′6″', 'dim'));
  out.push(text(140, 55 + 26, 'Closet side', 'lbl strong'), text(140, 90, 'about 6′9″ × 9′9″', 'dim'));
  out.push(text(108, 162, 'Alcove', 'lbl'));
  out.push(text(222, 38, 'Closet', 'lbl', 'start'), text(222, 47, '76 × 29½″', 'dim', 'start'));
  out.push(text(222, 102, 'Side door', 'lbl', 'start'));
  out.push(text(-7, 158, 'Entry', 'lbl', 'end'));
  out.push(text(12, 50, 'AC unit', 'dim', 'start'));
  out.push(text(120, -14, '180″ (15′)', 'dim'), text(-12, 90, '174″', 'dim', 'end'), text(-12, 99, '(14′6″)', 'dim', 'end'));
  out.push(text(45, 191, '123″ (10′3″)', 'dim'), text(131, 150, '57″', 'dim', 'start'), text(150, 132, '55″', 'dim'));
  out.push(text(92, 200, 'beam 82½″ high', 'dim'));

  out.push('<g id="dyn"><g id="eye" style="display:none"><path class="cone"/><circle class="eyedot" r="3.5"/></g></g>');
  svg.setAttribute('viewBox', '-46 -58 316 266');
  svg.innerHTML = out.join('');
}

export function showEye(svg, on) {
  svg.querySelector('#eye').style.display = on ? '' : 'none';
}

export function setEye(svg, e) {
  const g = svg.querySelector('#eye');
  const r = 34, a0 = ((e.yaw - 32) * Math.PI) / 180, a1 = ((e.yaw + 32) * Math.PI) / 180;
  g.querySelector('.cone').setAttribute('d',
    `M${f(e.x)},${f(e.y)} L${f(e.x + r * Math.cos(a0))},${f(e.y + r * Math.sin(a0))} A${r} ${r} 0 0 1 ${f(e.x + r * Math.cos(a1))},${f(e.y + r * Math.sin(a1))} Z`);
  const dot = g.querySelector('.eyedot');
  dot.setAttribute('cx', f(e.x));
  dot.setAttribute('cy', f(e.y));
}

export function toPlan(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [q.x, q.y];
}
