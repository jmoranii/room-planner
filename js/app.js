import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom, setFaded } from './scene.js';
import { drawPlan, showEye, setEye, toPlan } from './plan.js';
import { pointInRoom } from './geometry.js';

const $ = s => document.querySelector(s);
const host = $('#view3d'), svg = $('#plan');
const state = { view: 'orbit', room: null, built: null, eye: { x: 150, y: 40, yaw: 200, pitch: -6, h: 32 } };
const rooms = {};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 1, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 40;
controls.maxDistance = 1000;

scene.add(new THREE.HemisphereLight(0xffffff, 0xb3a999, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(-150, 400, -250);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

function themeBackground() {
  scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg3d').trim() || '#efece7');
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

function roomCenter() {
  const xs = state.room.outline.map(p => p[0]), ys = state.room.outline.map(p => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

const HINTS = {
  orbit: 'Drag to orbit · scroll or pinch to zoom · right-drag or two fingers to pan',
  top: 'Looking straight down · drag to tilt',
  eye: 'Drag the view to look around · tap or drag on the plan to move',
};

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
document.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => {
  state.eye.h = Number(b.dataset.h);
  document.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x === b));
  applyEye();
}));

// Look around by dragging the 3D view in eye mode.
let look = null;
renderer.domElement.addEventListener('pointerdown', e => {
  if (state.view !== 'eye') return;
  look = { x: e.clientX, y: e.clientY };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!look) return;
  state.eye.yaw -= (e.clientX - look.x) * 0.3;
  state.eye.pitch = Math.max(-70, Math.min(70, state.eye.pitch + (e.clientY - look.y) * 0.3));
  look = { x: e.clientX, y: e.clientY };
  applyEye();
});
renderer.domElement.addEventListener('pointerup', () => { look = null; });

// Move the eye by tapping or dragging on the plan.
let placing = false;
function placeEye(e) {
  const [x, y] = toPlan(svg, e);
  if (!pointInRoom(state.room, x, y)) return;
  state.eye.x = x;
  state.eye.y = y;
  applyEye();
}
svg.addEventListener('pointerdown', e => {
  if (state.view !== 'eye') return;
  placing = true;
  svg.setPointerCapture(e.pointerId);
  placeEye(e);
});
svg.addEventListener('pointermove', e => { if (placing) placeEye(e); });
svg.addEventListener('pointerup', () => { placing = false; });

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

async function useRoom(id) {
  if (state.room?.id === id) return;
  rooms[id] ??= await getJSON(`rooms/${id}.json`);
  state.room = rooms[id];
  if (state.built) scene.remove(state.built.root);
  state.built = buildRoom(state.room);
  scene.add(state.built.root);
  drawPlan(svg, state.room);
  $('#measurements').innerHTML = state.room.measurements.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

async function loadVersion(index, id) {
  const entry = index.find(v => v.id === id) ?? index[0];
  const layout = await getJSON(`layouts/${entry.file}`);
  await useRoom(layout.room);
  $('#notes').textContent = layout.notes ?? '';
  $('#version').value = entry.id;
  const url = new URL(location.href);
  url.searchParams.set('v', entry.id);
  history.replaceState(null, '', url);
  setView(state.view);
}

async function init() {
  themeBackground();
  const index = await getJSON('layouts/index.json');
  const sel = $('#version');
  sel.innerHTML = index.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
  sel.addEventListener('change', () => loadVersion(index, sel.value));
  await loadVersion(index, new URLSearchParams(location.search).get('v'));
}

init().catch(err => {
  $('#hint').textContent = `Could not load the room: ${err.message}`;
  console.error(err);
});
