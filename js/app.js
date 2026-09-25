import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom, setFaded } from './scene.js';
import { buildItem } from './items3d.js';
import { drawPlan, drawItems, moveItemSVG, markSelected, showEye, setEye, toPlan } from './plan.js';
import { pointInRoom } from './geometry.js';
import { CATALOG, CATEGORIES, SWATCHES, spec } from './catalog.js';
import { checkLayout } from './checks.js';

const $ = s => document.querySelector(s);
const host = $('#view3d'), svg = $('#plan');
const state = {
  view: 'orbit', mood: 'day', room: null, built: null, roomKey: '',
  index: [], version: null, items: [], options: {}, sel: null,
  eye: { x: 150, y: 40, yaw: 200, pitch: -6, h: 32 },
};
const rooms = {};
const meshes = new Map();

// ---------- 3D setup ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 1, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 40;
controls.maxDistance = 1000;

const hemi = new THREE.HemisphereLight(0xffffff, 0xb3a999, 2.2);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(-150, 400, -250);
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(hemi, sun, ambient);
const itemsGroup = new THREE.Group();
scene.add(itemsGroup);
const selBox = new THREE.BoxHelper(undefined, 0xc2562d);
selBox.visible = false;
scene.add(selBox);

function themeBackground() {
  const css = getComputedStyle(document.documentElement).getPropertyValue(state.mood === 'evening' ? '--bg3d-night' : '--bg3d').trim();
  scene.background = new THREE.Color(css || '#efece7');
  render();
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeBackground);

let pending = false;
function render() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    updateFade();
    if (selBox.visible) selBox.update();
    renderer.render(scene, camera);
  });
}
controls.addEventListener('change', render);

new ResizeObserver(() => {
  const { clientWidth: w, clientHeight: h } = host;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  render();
}).observe(host);

function updateFade() {
  if (!state.built) return;
  const eye = state.view === 'eye';
  for (const g of state.built.fadeGroups) {
    const { nOut, mid } = g.userData;
    const d = nOut[0] * (camera.position.x - mid[0]) + nOut[1] * (camera.position.z - mid[1]);
    setFaded(g, !eye && d > 0);
  }
}

// ---------- mood (day / evening) ----------
function applyMood() {
  const night = state.mood === 'evening';
  hemi.intensity = night ? 0.18 : 2.2;
  sun.intensity = night ? 0 : 1.2;
  ambient.intensity = night ? 0.1 : 0.5;
  for (const { light } of meshes.values()) if (light) light.intensity = night ? 420 * light.userData.glow : 0;
  state.built?.root.traverse(o => {
    if (o.material?.userData?.glass) o.material.color.set(night ? 0x2c3a4a : 0xd3e6f3);
  });
  document.querySelectorAll('[data-mood]').forEach(b => b.classList.toggle('on', b.dataset.mood === state.mood));
  themeBackground();
}

// ---------- views ----------
const HINTS = {
  orbit: 'Drag a piece to move it · drag empty space to orbit · pinch or scroll to zoom · two fingers to pan',
  top: 'Looking straight down · drag a piece to move it · drag empty space to tilt',
  eye: 'Drag to look around · drag a piece to move it · tap the plan to move where you sit',
};

function roomCenter() {
  const xs = state.room.outline.map(p => p[0]), ys = state.room.outline.map(p => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

function applyEye() {
  const e = state.eye, yaw = (e.yaw * Math.PI) / 180, pitch = (e.pitch * Math.PI) / 180;
  camera.position.set(e.x, e.h, e.y);
  camera.lookAt(e.x + Math.cos(yaw) * Math.cos(pitch), e.h + Math.sin(pitch), e.y + Math.sin(yaw) * Math.cos(pitch));
  setEye(svg, e);
  render();
}

function setView(view) {
  state.view = view;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  $('#eyeHeight').hidden = view !== 'eye';
  $('#hint').textContent = HINTS[view];
  state.built.ceiling.visible = view === 'eye';
  showEye(svg, view === 'eye');
  svg.classList.toggle('pickable', view === 'eye');
  const [cx, cz] = roomCenter();
  if (view === 'eye') {
    controls.enabled = false;
    camera.fov = 70;
    camera.updateProjectionMatrix();
    applyEye();
    return;
  }
  controls.enabled = true;
  camera.fov = 45;
  if (view === 'top') {
    camera.position.set(cx, 620, cz + 1);
    controls.target.set(cx, 0, cz);
  } else {
    camera.position.set(cx - 190, 300, cz + 250);
    controls.target.set(cx, 20, cz);
  }
  camera.updateProjectionMatrix();
  controls.update();
  render();
}

document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
document.querySelectorAll('[data-mood]').forEach(b => b.addEventListener('click', () => { state.mood = b.dataset.mood; applyMood(); }));
document.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => {
  state.eye.h = Number(b.dataset.h);
  document.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x === b));
  applyEye();
}));

// ---------- items ----------
const ctx = () => ({ ceiling: state.room.ceiling });

function addMesh(item) {
  const built = buildItem(item, ctx());
  itemsGroup.add(built.group);
  meshes.set(item.id, built);
  if (built.light) built.light.intensity = state.mood === 'evening' ? 420 * built.light.userData.glow : 0;
}

function removeMesh(id) {
  const m = meshes.get(id);
  if (!m) return;
  itemsGroup.remove(m.group);
  m.group.traverse(o => { o.geometry?.dispose(); });
  meshes.delete(id);
}

function rebuildItem(item) {
  removeMesh(item.id);
  addMesh(item);
  if (state.sel === item.id) selBox.setFromObject(meshes.get(item.id).group);
}

function rebuildAll() {
  for (const id of [...meshes.keys()]) removeMesh(id);
  state.items.forEach(addMesh);
  refresh();
}

function refresh() {
  drawItems(svg, state.items, state.sel);
  const m = state.sel && meshes.get(state.sel);
  selBox.visible = !!m;
  if (m) selBox.setFromObject(m.group);
  renderInspector();
  renderWarnings();
  render();
}

const byId = id => state.items.find(i => i.id === id);

function newId(type) {
  let n = 1;
  while (state.items.some(i => i.id === `${type}-${n}`)) n++;
  return `${type}-${n}`;
}

// Selecting only restyles the plan in place: redrawing it would replace the element under a finger mid-drag.
function select(id) {
  state.sel = id;
  markSelected(svg, id);
  const m = id && meshes.get(id);
  selBox.visible = !!m;
  if (m) selBox.setFromObject(m.group);
  renderInspector();
  renderWarnings();
  render();
}

function addItem(type) {
  const c = CATALOG[type];
  const n = state.items.length % 5;
  const item = { id: newId(type), type, x: 137 + n * 4, y: 58 + n * 4, rot: 0 };
  if (c.z) item.z = c.z;
  state.items.push(item);
  addMesh(item);
  select(item.id);
  saveDraft();
}

function updateItem(id, patch, { rebuild = true } = {}) {
  const it = byId(id);
  if (!it) return;
  Object.assign(it, patch);
  if (rebuild) rebuildItem(it);
  refresh();
  saveDraft();
}

function removeItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  removeMesh(id);
  if (state.sel === id) state.sel = null;
  refresh();
  saveDraft();
}

function duplicateItem(id) {
  const it = byId(id);
  if (!it) return;
  const copy = { ...it, id: newId(it.type), x: it.x + 6, y: it.y + 6 };
  state.items.push(copy);
  addMesh(copy);
  select(copy.id);
  saveDraft();
}

function moveLive(it) {
  const m = meshes.get(it.id);
  if (m) m.group.position.set(it.x, m.group.position.y, it.y);
  moveItemSVG(svg, it);
  if (selBox.visible) selBox.setFromObject(m.group);
  render();
}

// ---------- plan interaction ----------
let drag = null;
svg.addEventListener('pointerdown', e => {
  const el = e.target.closest?.('.item');
  const [x, y] = toPlan(svg, e);
  if (el) {
    const it = byId(el.dataset.id);
    if (state.sel !== it.id) select(it.id);
    drag = { kind: 'item', id: it.id, dx: x - it.x, dy: y - it.y, moved: false };
  } else if (state.view === 'eye') {
    drag = { kind: 'eye' };
    placeEye(x, y);
  } else {
    select(null);
    return;
  }
  svg.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove', e => {
  if (!drag) return;
  const [x, y] = toPlan(svg, e);
  if (drag.kind === 'eye') return placeEye(x, y);
  const it = byId(drag.id);
  it.x = Math.round(x - drag.dx);
  it.y = Math.round(y - drag.dy);
  drag.moved = true;
  moveLive(it);
});
svg.addEventListener('pointerup', () => {
  if (drag?.kind === 'item' && drag.moved) { renderWarnings(); renderInspector(); saveDraft(); }
  drag = null;
});

function placeEye(x, y) {
  if (!pointInRoom(state.room, x, y)) return;
  state.eye.x = x;
  state.eye.y = y;
  applyEye();
}

// 3D pointer: press a piece and drag to slide it across the floor, tap to select it;
// otherwise drag orbits (or looks around at eye level).
const raycaster = new THREE.Raycaster();
let press = null;

function rayFrom(e) {
  const r = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  return raycaster;
}

function hitItem(e) {
  const hit = rayFrom(e).intersectObjects(itemsGroup.children, true).find(h => h.object.isMesh);
  let o = hit?.object;
  while (o && !o.userData.id) o = o.parent;
  return o ? { id: o.userData.id, point: hit.point } : null;
}

// Capture phase on the container runs before OrbitControls, so pressing a piece never starts an orbit.
host.addEventListener('pointerdown', e => {
  if (e.target !== renderer.domElement) return;
  const hit = hitItem(e);
  press = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, hit };
  if (hit) {
    controls.enabled = false;
    const it = byId(hit.id);
    press.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -hit.point.y);
    press.dx = hit.point.x - it.x;
    press.dz = hit.point.z - it.y;
  }
  if (hit || state.view === 'eye') renderer.domElement.setPointerCapture(e.pointerId);
}, true);

renderer.domElement.addEventListener('pointermove', e => {
  if (!press) return;
  if (Math.hypot(e.clientX - press.x0, e.clientY - press.y0) > 6) press.moved = true;
  if (press.hit) {
    if (!press.moved) return;
    if (state.sel !== press.hit.id) select(press.hit.id);
    const p = rayFrom(e).ray.intersectPlane(press.plane, new THREE.Vector3());
    if (!p) return;
    const it = byId(press.hit.id);
    it.x = Math.round(p.x - press.dx);
    it.y = Math.round(p.z - press.dz);
    moveLive(it);
    return;
  }
  if (state.view !== 'eye') return;
  state.eye.yaw -= (e.clientX - press.x) * 0.3;
  state.eye.pitch = Math.max(-70, Math.min(70, state.eye.pitch + (e.clientY - press.y) * 0.3));
  press.x = e.clientX;
  press.y = e.clientY;
  applyEye();
});

renderer.domElement.addEventListener('pointerup', () => {
  if (!press) return;
  if (press.hit && press.moved) { renderWarnings(); renderInspector(); saveDraft(); }
  else if (!press.moved) select(press.hit?.id ?? null);
  controls.enabled = state.view !== 'eye';
  press = null;
});
renderer.domElement.addEventListener('pointercancel', () => {
  controls.enabled = state.view !== 'eye';
  press = null;
});

// On touch screens, a finger on a piece (or anywhere at eye level) drags instead of scrolling the page.
svg.addEventListener('touchstart', e => {
  if (e.target.closest?.('.item') || state.view === 'eye') e.preventDefault();
}, { passive: false });
svg.addEventListener('pointercancel', () => { drag = null; });

document.addEventListener('keydown', e => {
  if (!state.sel || e.target.closest('input, select, textarea')) return;
  const it = byId(state.sel);
  const step = e.shiftKey ? 6 : 1;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (moves[e.key]) {
    e.preventDefault();
    it.x += moves[e.key][0];
    it.y += moves[e.key][1];
    moveLive(it);
    renderWarnings();
    saveDraft();
  } else if (e.key === 'r' || e.key === 'R') {
    updateItem(it.id, { rot: (((it.rot ?? 0) + (e.shiftKey ? -15 : 15)) % 360 + 360) % 360 });
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    removeItem(it.id);
  } else if (e.key === 'Escape') {
    select(null);
  }
});

// ---------- side panel ----------
function renderPalette() {
  $('#palette').innerHTML = CATEGORIES.map(cat => {
    const rows = Object.entries(CATALOG).filter(([, c]) => c.cat === cat)
      .map(([k, c]) => `<button type="button" class="add" data-add="${k}" title="${c.note ?? ''}"><span>${c.name}</span><small>${c.w}×${c.d}${c.h >= 1 ? `×${c.h}` : ''}″</small></button>`).join('');
    return `<details><summary>${cat}</summary><div class="adds">${rows}</div></details>`;
  }).join('');
}
$('#palette').addEventListener('click', e => {
  const b = e.target.closest('[data-add]');
  if (b) addItem(b.dataset.add);
});

function num(label, key, value, stepVal = 1) {
  return `<label class="num"><span>${label}</span><input type="number" step="${stepVal}" min="0" data-k="${key}" value="${Math.round(value * 10) / 10}"></label>`;
}

function renderInspector() {
  const box = $('#inspector');
  const it = state.sel && byId(state.sel);
  const bar = $('#selbar');
  if (!it) {
    box.innerHTML = '<p class="muted">Tap a piece to select it. To move it, press and drag it, in the 3D view or on the plan. The arrow buttons nudge it too.</p>';
    bar.hidden = true;
    return;
  }
  const s = spec(it);
  bar.hidden = false;
  bar.innerHTML = `
    <strong>${s.short ?? s.name}</strong>
    <span class="selhint">drag it to move</span>
    <span class="selbtns">
      <button type="button" data-rot="-45" aria-label="Turn left">↶</button>
      <button type="button" data-rot="45" aria-label="Turn right">↷</button>
      <button type="button" data-move="-6,0" aria-label="Move west">←</button>
      <button type="button" data-move="0,-6" aria-label="Move north">↑</button>
      <button type="button" data-move="0,6" aria-label="Move south">↓</button>
      <button type="button" data-move="6,0" aria-label="Move east">→</button>
      <button type="button" data-act="del" class="danger" aria-label="Remove">Remove</button>
      <button type="button" data-act="done" aria-label="Done">Done</button>
    </span>`;
  box.innerHTML = `
    <div class="insp-head"><strong>${s.name}</strong>${s.note ? `<small>${s.note}</small>` : ''}</div>
    <div class="row">
      <div class="seg small" role="group" aria-label="Turn">
        <button type="button" data-rot="-90" aria-label="Turn left 90 degrees">↶ 90°</button>
        <button type="button" data-rot="-15" aria-label="Turn left 15 degrees">↶ 15°</button>
        <button type="button" data-rot="15" aria-label="Turn right 15 degrees">15° ↷</button>
        <button type="button" data-rot="90" aria-label="Turn right 90 degrees">90° ↷</button>
      </div>
    </div>
    <div class="row">
      <div class="seg small" role="group" aria-label="Move">
        <button type="button" data-move="-6,0" aria-label="Move west 6 inches">← 6″</button>
        <button type="button" data-move="0,-6" aria-label="Move north 6 inches">↑ 6″</button>
        <button type="button" data-move="0,6" aria-label="Move south 6 inches">↓ 6″</button>
        <button type="button" data-move="6,0" aria-label="Move east 6 inches">6″ →</button>
      </div>
    </div>
    <div class="row nums">
      ${num('Width', 'w', s.w)}${num('Depth', 'd', s.d)}${num('Height', 'h', s.h)}${num('Off floor', 'z', s.z)}
    </div>
    <div class="swatches" role="group" aria-label="Color">
      ${SWATCHES.map(c => `<button type="button" class="sw${c === s.color ? ' on' : ''}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('')}
      <label class="sw custom" aria-label="Custom color"><input type="color" value="${s.color}" data-k="color"></label>
    </div>
    <div class="row actions">
      <button type="button" class="btn" data-act="dup">Duplicate</button>
      <button type="button" class="btn danger" data-act="del">Remove</button>
    </div>
    <p class="muted tiny">At ${Math.round(it.x)}″ east, ${Math.round(it.y)}″ south · turned ${it.rot ?? 0}° · keys: arrows nudge, R turns, Delete removes</p>`;
}

function pieceAction(e) {
  const it = state.sel && byId(state.sel);
  const b = e.target.closest('button');
  if (!it || !b) return;
  if (b.dataset.rot) updateItem(it.id, { rot: (((it.rot ?? 0) + Number(b.dataset.rot)) % 360 + 360) % 360 });
  if (b.dataset.move) {
    const [dx, dy] = b.dataset.move.split(',').map(Number);
    it.x += dx;
    it.y += dy;
    moveLive(it);
    renderWarnings();
    renderInspector();
    saveDraft();
  }
  if (b.dataset.color) updateItem(it.id, { color: b.dataset.color });
  if (b.dataset.act === 'dup') duplicateItem(it.id);
  if (b.dataset.act === 'del') removeItem(it.id);
  if (b.dataset.act === 'done') select(null);
}
$('#inspector').addEventListener('click', pieceAction);
$('#selbar').addEventListener('click', pieceAction);
$('#inspector').addEventListener('change', e => {
  const it = state.sel && byId(state.sel);
  const k = e.target.dataset.k;
  if (!it || !k) return;
  updateItem(it.id, { [k]: k === 'color' ? e.target.value : Math.max(0, Number(e.target.value) || 0) });
});

function renderWarnings() {
  const list = checkLayout(state.room, state.items, state.options);
  $('#warnings').innerHTML = list.length
    ? list.map(w => `<li><button type="button" data-warn="${w.id}">${w.text}</button></li>`).join('')
    : '<li class="ok">Door swings, the egress window and the drain cover are all clear.</li>';
}
$('#warnings').addEventListener('click', e => {
  const b = e.target.closest('[data-warn]');
  if (b) select(b.dataset.warn);
});

$('#closetDoors').addEventListener('change', e => {
  state.options.closetDoors = e.target.checked;
  useRoom(state.version.room, true);
  saveDraft();
});

// ---------- versions, drafts, sharing ----------
const draftKey = () => `room-planner:v1:${state.version.id}`;
function saveDraft() {
  try {
    localStorage.setItem(draftKey(), JSON.stringify({ items: state.items, options: state.options }));
    $('#draftNote').hidden = false;
  } catch { /* storage unavailable: edits just aren't kept */ }
}
function readDraft() {
  try { return JSON.parse(localStorage.getItem(draftKey()) ?? 'null'); } catch { return null; }
}

$('#resetDraft').addEventListener('click', () => {
  try { localStorage.removeItem(draftKey()); } catch { /* ignore */ }
  loadVersion(state.version.id);
});

$('#copyLayout').addEventListener('click', async () => {
  const out = {
    id: state.version.id, name: state.version.name, room: state.version.room, notes: state.version.notes,
    mood: state.mood, options: state.options,
    items: state.items.map(({ id, type, x, y, rot, z, w, d, h, color, accent, label }) => Object.fromEntries(Object.entries({ id, type, x, y, rot, z, w, d, h, color, accent, label }).filter(([, v]) => v !== undefined))),
  };
  const text = JSON.stringify(out, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    toast('Layout copied. Paste it to Hugo to save it as a version.');
  } catch {
    const blob = new Blob([text], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${state.version.id}.json` });
    a.click();
    toast('Layout downloaded.');
  }
});

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3500);
}

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

async function useRoom(id, force = false) {
  const key = `${id}|${state.options.closetDoors !== false}`;
  if (!force && state.roomKey === key) return;
  rooms[id] ??= await getJSON(`rooms/${id}.json`);
  state.room = rooms[id];
  state.roomKey = key;
  if (state.built) scene.remove(state.built.root);
  state.built = buildRoom(state.room, state.options);
  scene.add(state.built.root);
  drawPlan(svg, state.room, state.options);
  $('#closetDoors').checked = state.options.closetDoors !== false;
  $('#measurements').innerHTML = state.room.measurements.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  if (state.view) setView(state.view);
  applyMood();
  refresh();
}

async function loadVersion(id) {
  const entry = state.index.find(v => v.id === id) ?? state.index[0];
  const layout = await getJSON(`layouts/${entry.file}`);
  state.version = { ...layout, id: entry.id, name: entry.name, room: layout.room };
  const draft = readDraft();
  const src = draft ?? layout;
  state.items = structuredClone(src.items ?? []);
  state.options = structuredClone(src.options ?? layout.options ?? {});
  state.mood = layout.mood ?? 'day';
  state.sel = null;
  state.eye = { x: 150, y: 40, yaw: 200, pitch: -6, h: state.eye.h, ...(layout.eye ?? {}) };
  $('#draftNote').hidden = !draft;
  $('#notes').textContent = layout.notes ?? '';
  $('#version').value = entry.id;
  const url = new URL(location.href);
  url.searchParams.set('v', entry.id);
  history.replaceState(null, '', url);
  await useRoom(layout.room, true);
  rebuildAll();
  applyMood();
  setView(state.view);
}

async function init() {
  renderPalette();
  renderInspector();
  state.index = await getJSON('layouts/index.json');
  const sel = $('#version');
  sel.innerHTML = state.index.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
  sel.addEventListener('change', () => loadVersion(sel.value));
  await loadVersion(new URLSearchParams(location.search).get('v'));
}

if (new URLSearchParams(location.search).has('debug')) window.__rp = { camera, state, meshes };

init().catch(err => {
  $('#hint').textContent = `Could not load the room: ${err.message}`;
  console.error(err);
});
