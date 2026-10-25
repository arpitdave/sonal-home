import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PRESETS, TYPES, buildModel } from './models.js';
import { buildEnvironment } from './environment.js';

// World units are centimetres. Floor-plan x -> world x, floor-plan y -> world z.
const house = await (await fetch('house.json')).json();
const WALL_H = house.wallHeight;
const CUT_H = 110;
const EYE_H = 165;

const view = document.getElementById('view');
const statusEl = document.getElementById('status');

// ---------- renderer, scene, cameras ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
view.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none';
view.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9e6e0');

const bounds = new THREE.Box3();
for (const w of house.walls) for (const p of [w.a, w.b]) bounds.expandByPoint(new THREE.Vector3(p[0], 0, p[1]));
const center = bounds.getCenter(new THREE.Vector3());
const size = bounds.getSize(new THREE.Vector3());

const persp = new THREE.PerspectiveCamera(45, 1, 5, 20000);
persp.position.set(center.x + 650, 1600, center.z + 950);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
ortho.position.set(center.x, 3000, center.z);
ortho.up.set(0, 0, -1);
const walkCam = new THREE.PerspectiveCamera(70, 1, 5, 20000);
walkCam.rotation.order = 'YXZ';

const orbit = new OrbitControls(persp, renderer.domElement);
orbit.target.copy(center);
orbit.maxPolarAngle = Math.PI / 2 - 0.05;
orbit.enableDamping = true;
const pan = new OrbitControls(ortho, renderer.domElement);
pan.target.set(center.x, 0, center.z);
pan.enableRotate = false;
pan.screenSpacePanning = true;
pan.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
pan.enabled = false;

let mode = 'orbit';
let camera = persp;

// ---------- lights ----------
scene.add(new THREE.HemisphereLight('#ffffff', '#b9ad9c', 1.6), new THREE.AmbientLight('#ffffff', 0.35));
const sun = new THREE.DirectionalLight('#fff6e8', 2.2);
// High sun for the 3D/Plan views; low morning sun from the street (bedroom) side for Walk.
const SUN_DAY = new THREE.Vector3(center.x - 350, 2200, center.z + 600);
const SUN_MORNING = new THREE.Vector3(center.x + 700, 1250, center.z + 2000);
sun.position.copy(SUN_DAY);
sun.target.position.copy(center);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = sc.bottom = -1100; sc.right = sc.top = 1100; sc.near = 100; sc.far = 4000;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.5;
scene.add(sun, sun.target);

// ---------- procedural textures ----------
function canvasTex(px, draw, worldSize) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  draw(c.getContext('2d'), px);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / worldSize, 1 / worldSize);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function rnd(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

const floorMats = {
  oak: new THREE.MeshStandardMaterial({ roughness: 0.65, map: canvasTex(1024, (g, s) => {
    const r = rnd(7), rows = 10, ph = s / rows;  // 20 cm planks on a 200 cm tile
    for (let i = 0; i < rows; i++) {
      let x = -r() * s;
      while (x < s) {
        const len = s * (0.35 + r() * 0.5), l = 62 + r() * 10;
        g.fillStyle = `hsl(${30 + r() * 5}, ${38 + r() * 8}%, ${l}%)`;
        g.fillRect(x, i * ph, len, ph);
        g.strokeStyle = 'rgba(80,50,20,.35)'; g.lineWidth = 2; g.strokeRect(x, i * ph, len, ph);
        for (let k = 0; k < 6; k++) {
          g.strokeStyle = `rgba(90,60,30,${0.05 + r() * 0.07})`; g.lineWidth = 1;
          const y = i * ph + r() * ph; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (r() - 0.5) * 6); g.stroke();
        }
        x += len;
      }
    }
  }, 200) }),
  tile: new THREE.MeshStandardMaterial({ roughness: 0.4, map: canvasTex(256, (g, s) => {
    g.fillStyle = '#d9dcdd'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#b4b8ba'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  }, 30) }),
  kitchen: new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(256, (g, s) => {
    g.fillStyle = '#c9c6c1'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#a9a6a1'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  }, 60) }),
  deck: new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(512, (g, s) => {
    const r = rnd(3);
    for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(30, 6%, ${52 + r() * 8}%)`; g.fillRect(0, i * s / 8, s, s / 8 - 4); }
  }, 120) }),
  concrete: new THREE.MeshStandardMaterial({ color: '#bdbab4', roughness: 0.95 }),
};

const wallMat = new THREE.MeshStandardMaterial({ color: '#f7f5f1', roughness: 0.92 });
const wallTopMat = new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.9 });
const wallMats = [wallMat, wallMat, wallTopMat, wallMat, wallMat, wallMat];
// Accent paint on the living-room side of the balcony wall (box face 4 = +z = room side);
// door reveals and frames stay white like trim. Muted sage/olive, as in Sonal's Pinterest reference.
const accentMat = new THREE.MeshStandardMaterial({ color: '#5f7458', roughness: 0.95 });
const accentMats = [wallMat, wallMat, wallTopMat, wallMat, accentMat, wallMat];
const glassMat = new THREE.MeshPhysicalMaterial({ color: '#cfe3ee', transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0, depthWrite: false });
const frameMat = new THREE.MeshStandardMaterial({ color: '#f0f0ee', roughness: 0.6 });
const railMat = new THREE.MeshStandardMaterial({ color: '#3c3c3c', roughness: 0.5, metalness: 0.4 });

// ---------- floors, slab, ceiling ----------
const structure = new THREE.Group();
scene.add(structure);

function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a / 2);
}
function polyCentroid(poly) {
  let cx = 0, cz = 0, a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length];
    const f = x1 * z2 - x2 * z1;
    a += f; cx += (x1 + x2) * f; cz += (z1 + z2) * f;
  }
  return [cx / (3 * a), cz / (3 * a)];
}
function flatMesh(poly, material, y) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.position.y = y;
  return m;
}

const labelObjs = [];
const roomLabelPos = { 'Living room': [330, -260], 'Kitchen': [130, -50] };
for (const room of house.rooms) {
  if (room.material === 'duct') {
    const xs = room.poly.map(p => p[0]), zs = room.poly.map(p => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...zs) - Math.min(...zs);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMats);
    m.position.set((Math.max(...xs) + Math.min(...xs)) / 2, WALL_H / 2, (Math.max(...zs) + Math.min(...zs)) / 2);
    m.castShadow = m.receiveShadow = true;
    m.userData.solid = true;
    structure.add(m);
    continue;
  }
  const floor = flatMesh(room.poly, floorMats[room.material], room.overlay ? 0.4 : 0);
  floor.receiveShadow = true;
  floor.userData.floor = true;
  structure.add(floor);

  const area = polyArea(room.poly);
  const xs = room.poly.map(p => p[0]), zs = room.poly.map(p => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs), bd = Math.max(...zs) - Math.min(...zs);
  const el = document.createElement('div');
  el.className = 'room-label';
  const rect = area / (bw * bd) > 0.9 && room.name !== 'Kitchen';
  el.innerHTML = `<b>${room.name}</b>${(area / 1e4).toFixed(1)} m²` +
    (rect && area > 2e4 ? `<br>${(bw / 100).toFixed(2)} × ${(bd / 100).toFixed(2)} m` : '');
  if (room.name === 'Meter cupboard' || room.name === 'Shower') el.innerHTML = `<b style="font-size:11px">${room.name}</b>`;
  const [lx, lz] = roomLabelPos[room.name] || polyCentroid(room.poly);
  const lbl = new CSS2DObject(el);
  lbl.position.set(lx, 5, lz);
  scene.add(lbl);
  labelObjs.push(lbl);
}

// concrete slab under the apartment and the balcony (it's a first-floor flat)
{
  const slab = new THREE.Mesh(new THREE.BoxGeometry(size.x + 20, 30, size.z + 20),
    new THREE.MeshStandardMaterial({ color: '#cfcac2', roughness: 1 }));
  slab.position.set(center.x, -15.5, center.z);
  slab.receiveShadow = true;
  structure.add(slab);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ color: '#dcd8d0', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -300;
  ground.receiveShadow = true;
  scene.add(ground);
}

// ceiling: one-sided, faces down, so it's invisible from above but closes the rooms in Walk view
const ceiling = flatMesh([[-36, -485], [540, -485], [540, 732], [-36, 732]], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#8f8b84', roughness: 1, side: THREE.BackSide }), WALL_H);
scene.add(ceiling);

// ---------- walls ----------
function wallFrame(w) {
  const [ax, az] = w.a, [bx, bz] = w.b;
  const len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len, uz = (bz - az) / len;
  const nx = -uz, nz = ux;
  const off = (1 - 2 * w.balance) * w.t / 2;
  return { ax, az, bx, bz, len, ux, uz, nx, nz, off };
}
const frames = house.walls.map(wallFrame);

// How far to extend a wall end so it meets the far face of whichever wall it runs into.
function extension(i, px, pz, dirx, dirz) {
  let ext = 0;
  frames.forEach((o, j) => {
    if (j === i) return;
    const vx = px - o.ax, vz = pz - o.az;
    const along = vx * o.ux + vz * o.uz;
    const perp = vx * o.nx + vz * o.nz;
    if (along < -1.5 || along > o.len + 1.5 || Math.abs(perp) > 1.5) return;
    const dn = dirx * o.nx + dirz * o.nz;
    if (Math.abs(dn) < 0.2) return;
    const t = house.walls[j].t;
    for (const face of [o.off + t / 2, o.off - t / 2]) {
      const s = (face - perp) / dn;
      if (s > ext && s < 60) ext = s;
    }
  });
  return ext;
}

const wallGroup = new THREE.Group();
structure.add(wallGroup);

function addPiece(f, w, s0, s1, y0, y1, material, thick = w.t, group = wallGroup) {
  if (s1 - s0 < 0.1 || y1 - y0 < 0.1) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0, y1 - y0, thick), material);
  const s = (s0 + s1) / 2;
  m.position.set(f.ax + f.ux * s + f.nx * f.off, (y0 + y1) / 2, f.az + f.uz * s + f.nz * f.off);
  m.rotation.y = Math.atan2(-f.uz, f.ux);
  m.castShadow = material !== glassMat;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function buildWalls(maxH) {
  wallGroup.clear();
  house.walls.forEach((w, i) => {
    const f = frames[i];
    const H = Math.min(w.h, maxH);
    if (w.railing) {  // balcony balustrade: top rail + posts + glass
      addPiece(f, w, 0, f.len, w.h - 5, w.h, railMat, 5);
      addPiece(f, w, 0, f.len, 3, w.h - 5, glassMat, 1);
      for (let s = 0; s <= f.len; s += 110) addPiece(f, w, s - 2, s + 2, 0, w.h, railMat, 4);
      return;
    }
    const s0 = -extension(i, f.ax, f.az, -f.ux, -f.uz);
    const s1 = f.len + extension(i, f.bx, f.bz, f.ux, f.uz);
    const ops = w.openings.map(o => ({ ...o, c0: o.t * f.len - o.w / 2, c1: o.t * f.len + o.w / 2 }))
      .sort((p, q) => p.c0 - q.c0);
    const mats = w.facade && f.az < 0 ? accentMats : wallMats;
    let cur = s0;
    for (const o of ops) {
      addPiece(f, w, cur, o.c0, 0, H, mats);
      addPiece(f, w, o.c0, o.c1, 0, Math.min(o.z, H), mats);
      addPiece(f, w, o.c0, o.c1, Math.min(o.z + o.h, H), H, mats);
      if (w.facade) addGlazing(f, w, o, H);
      cur = o.c1;
    }
    addPiece(f, w, cur, s1, 0, H, mats);
  });
  wallGroup.traverse(m => { if (m.isMesh && (m.material === wallMats || m.material === accentMats)) m.userData.solid = true; });
}

function addGlazing(f, w, o, H) {
  const top = Math.min(o.z + o.h, H), fr = 6, ft = 7;
  if (top <= o.z) return;
  addPiece(f, w, o.c0, o.c1, o.z, top, glassMat, 1);
  addPiece(f, w, o.c0, o.c0 + fr, o.z, top, frameMat, ft);
  addPiece(f, w, o.c1 - fr, o.c1, o.z, top, frameMat, ft);
  if (top === o.z + o.h) addPiece(f, w, o.c0, o.c1, top - fr, top, frameMat, ft);
  addPiece(f, w, o.c0, o.c1, o.z, o.z + (o.type === 'door' ? 3 : fr), frameMat, ft);
  if (o.w >= 100) addPiece(f, w, (o.c0 + o.c1) / 2 - 3, (o.c0 + o.c1) / 2 + 3, o.z, top, frameMat, ft);
}

// ---------- surroundings (Walk view only) ----------
const surroundings = buildEnvironment({ x0: -44, x1: 548, zBack: -500, zFront: 747, floorTop: WALL_H + 30 });
surroundings.visible = false;
scene.add(surroundings);
const walkFog = new THREE.Fog('#e3e9ed', 2500, 14000);

// ---------- fixed kitchen & bathroom fixtures from the plan ----------
const fixtureGroup = new THREE.Group();
scene.add(fixtureGroup);
for (const fx of house.fixtures) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(fx.w, Math.max(fx.h, 0.5), fx.d),
    new THREE.MeshStandardMaterial({ color: fx.color, roughness: 0.5 }));
  m.position.set(fx.x, fx.y + Math.max(fx.h, 0.5) / 2, fx.z);
  m.rotation.y = -THREE.MathUtils.degToRad(fx.rot);
  m.castShadow = m.receiveShadow = true;
  m.userData.solid = true;
  m.userData.name = fx.name;
  fixtureGroup.add(m);
}
// worktop on the kitchen counters
for (const fx of house.fixtures.filter(f => f.name === 'Kitchen counter')) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(fx.w, 3, fx.d + 2), new THREE.MeshStandardMaterial({ color: '#4b4845', roughness: 0.4 }));
  m.position.set(fx.x, fx.h + 1.5, fx.z);
  m.rotation.y = -THREE.MathUtils.degToRad(fx.rot);
  m.castShadow = true;
  fixtureGroup.add(m);
}

// ---------- furniture ----------
const furnitureGroup = new THREE.Group();
scene.add(furnitureGroup);
let items = [];
let selectedId = null;

function uid() { return Math.random().toString(36).slice(2, 10); }

function renderItem(item) {
  const old = furnitureGroup.children.find(c => c.userData.id === item.id);
  if (old) furnitureGroup.remove(old);
  const g = buildModel(item);
  g.position.set(item.x, item.elevation || 0, item.z);
  g.rotation.y = -THREE.MathUtils.degToRad(item.rot || 0);
  g.userData.id = item.id;
  g.traverse(m => { if (m.isMesh) m.userData.itemId = item.id; });
  furnitureGroup.add(g);
  if (item.id === selectedId) addSelectionBox(g, item);
}

function renderAll() {
  furnitureGroup.clear();
  items.forEach(renderItem);
  renderList();
  updateClearance();
}

function addSelectionBox(g, item) {
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(item.w + 2, item.h + 2, item.d + 2));
  const box = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#c4622d', depthTest: false }));
  box.position.y = item.h / 2;
  box.renderOrder = 10;
  g.add(box);
}

let saveTimer = null;
let savePending = false;
// False once a save fails (e.g. a static host like GitHub Pages): edits then stay in this tab
// and the file sync stops, so it doesn't undo them.
let canSaveFile = true;
function save() {
  savePending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const body = JSON.stringify({ items }, null, 1);
    lastFile = body;
    try { localStorage.setItem('sonal-home-furniture', body); } catch {}
    try {
      const r = await fetch('furniture.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
      canSaveFile = r.ok;
    } catch { canSaveFile = false; }
    setStatus(canSaveFile ? 'Saved' : 'Changes are only kept in this tab');
    savePending = false;
  }, 300);
}

// Last furniture.json contents this page loaded or saved; used to pick up edits made elsewhere
// (another tab, or furniture.json edited by hand) instead of overwriting them.
let lastFile = null;

async function load() {
  try {
    const r = await fetch('furniture.json');
    if (r.ok) { lastFile = await r.text(); items = JSON.parse(lastFile).items || []; return; }
  } catch {}
  try { items = JSON.parse(localStorage.getItem('sonal-home-furniture')).items || []; } catch { items = []; }
}

function setStatus(t) {
  statusEl.textContent = t;
  clearTimeout(setStatus.t);
  setStatus.t = setTimeout(() => { statusEl.textContent = modeHint(); }, 1500);
}
function modeHint() {
  if (measuring) return 'Measure: click two points on the floor. Esc to stop.';
  return { orbit: 'Drag to orbit · right-drag to pan · scroll to zoom', top: 'Drag to pan · scroll to zoom',
    walk: 'Drag to look · W A S D to walk' }[mode];
}

function selected() { return items.find(i => i.id === selectedId); }

function select(id) {
  selectedId = id;
  renderAll();
  const it = selected();
  editor.style.display = it ? 'block' : 'none';
  if (it) fillEditor(it);
}

function update(item, patch, opts = {}) {
  Object.assign(item, patch);
  renderItem(item);
  if (!opts.silent) fillEditor(item);
  renderList();
  updateClearance();
  save();
}

function addItem(preset) {
  const target = mode === 'walk'
    ? new THREE.Vector3(0, 0, -150).applyEuler(new THREE.Euler(0, walkCam.rotation.y, 0)).add(walkCam.position)
    : (mode === 'top' ? pan.target : orbit.target);
  const item = { id: uid(), ...preset, x: Math.round(target.x), z: Math.round(target.z), rot: 0, elevation: preset.elevation || 0 };
  items.push(item);
  save();
  select(item.id);
}

// ---------- side panel ----------
const presetsEl = document.getElementById('presets');
for (const p of PRESETS) {
  const b = document.createElement('button');
  b.textContent = p.name;
  b.title = `${p.w} × ${p.d} × ${p.h} cm`;
  b.onclick = () => addItem(p);
  presetsEl.appendChild(b);
}

const editor = document.getElementById('editor');
const typeSel = editor.querySelector('select[data-k=type]');
TYPES.forEach(t => typeSel.add(new Option(t, t)));
const fields = [...editor.querySelectorAll('[data-k]')];
function fillEditor(it) {
  for (const f of fields) {
    if (f === document.activeElement) continue;
    const v = it[f.dataset.k] ?? (f.type === 'number' ? 0 : '');
    f.value = f.type === 'number' ? Math.round(v * 10) / 10 : v;
  }
}
for (const f of fields) {
  f.addEventListener('input', () => {
    const it = selected();
    if (!it) return;
    let v = f.value;
    if (f.type === 'number') { v = parseFloat(v); if (!Number.isFinite(v)) return; }
    update(it, { [f.dataset.k]: v }, { silent: true });
  });
}
document.getElementById('rot90').onclick = () => rotateSel(90);
document.getElementById('dup').onclick = duplicateSel;
document.getElementById('del').onclick = deleteSel;

function rotateSel(deg) { const it = selected(); if (it) update(it, { rot: (((it.rot || 0) + deg) % 360 + 360) % 360 }); }
function duplicateSel() {
  const it = selected(); if (!it) return;
  const copy = { ...it, id: uid(), x: it.x + 20, z: it.z + 20 };
  items.push(copy); save(); select(copy.id);
}
function deleteSel() {
  if (!selectedId) return;
  items = items.filter(i => i.id !== selectedId);
  save(); select(null);
}

const listEl = document.getElementById('list');
function renderList() {
  if (!items.length) { listEl.innerHTML = '<div class="sub">Nothing yet. Pick something above.</div>'; return; }
  listEl.innerHTML = '';
  for (const it of items) {
    const d = document.createElement('div');
    if (it.id === selectedId) d.className = 'sel';
    d.innerHTML = `<span></span><small>${Math.round(it.w)}×${Math.round(it.d)}×${Math.round(it.h)}</small>`;
    d.firstChild.textContent = it.name;
    d.onclick = () => select(it.id);
    listEl.appendChild(d);
  }
}

// ---------- clearance lines (distance from selected item to nearest wall/object) ----------
const clearanceGroup = new THREE.Group();
scene.add(clearanceGroup);
const ray = new THREE.Raycaster();
const showClearance = document.getElementById('clearance');

function obstacleMeshes(excludeId) {
  const out = [];
  wallGroup.traverse(m => { if (m.isMesh && m.userData.solid) out.push(m); });
  structure.traverse(m => { if (m.isMesh && m.userData.solid && m.parent === structure) out.push(m); });
  fixtureGroup.children.forEach(m => out.push(m));
  furnitureGroup.traverse(m => { if (m.isMesh && m.userData.itemId !== excludeId) out.push(m); });
  return out;
}

function makeLabel(text, cls = 'dim-label') {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  return new CSS2DObject(el);
}

function clearGroup(g) {
  g.traverse(o => { if (o.isCSS2DObject) o.element.remove(); });
  g.clear();
}

function updateClearance() {
  clearGroup(clearanceGroup);
  const it = selected();
  if (!it || !showClearance.checked || it.type === 'rug') return;
  const rad = THREE.MathUtils.degToRad(it.rot || 0);
  const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
  const hx = (it.w * c + it.d * s) / 2, hz = (it.w * s + it.d * c) / 2;
  const y = (it.elevation || 0) + Math.min(it.h / 2, 40);
  const obstacles = obstacleMeshes(it.id);
  for (const [dx, dz, half] of [[1, 0, hx], [-1, 0, hx], [0, 1, hz], [0, -1, hz]]) {
    const origin = new THREE.Vector3(it.x + dx * half, y, it.z + dz * half);
    // start 1 cm inside the item so an item flush against a wall still registers that wall
    ray.set(new THREE.Vector3(origin.x - dx, y, origin.z - dz), new THREE.Vector3(dx, 0, dz));
    ray.far = 600;
    const hit = ray.intersectObjects(obstacles, false)[0];
    if (!hit) continue;
    hit.distance = Math.max(0, hit.distance - 1);
    const pts = [origin, hit.point];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: '#c4622d', depthTest: false }));
    line.renderOrder = 11;
    clearanceGroup.add(line);
    const lbl = makeLabel(`${Math.round(hit.distance)} cm`);
    lbl.position.copy(origin).lerp(hit.point, 0.5);
    clearanceGroup.add(lbl);
  }
}
showClearance.onchange = updateClearance;

// ---------- measure tool ----------
let measuring = false;
let measureA = null;
const measureGroup = new THREE.Group();
scene.add(measureGroup);
const measureBtn = document.getElementById('measure');
function setMeasuring(on) {
  measuring = on;
  measureA = null;
  measureBtn.classList.toggle('on', on);
  measureBtn.textContent = on ? 'Stop measuring' : 'Measure tool';
  if (!on) clearGroup(measureGroup);
  statusEl.textContent = modeHint();
}
measureBtn.onclick = () => setMeasuring(!measuring);

function drawMeasure(a, b) {
  clearGroup(measureGroup);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]),
    new THREE.LineBasicMaterial({ color: '#1f5fa8', depthTest: false }));
  line.renderOrder = 12;
  measureGroup.add(line);
  for (const p of [a, b]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: '#1f5fa8', depthTest: false }));
    dot.position.copy(p); dot.renderOrder = 12;
    measureGroup.add(dot);
  }
  const lbl = makeLabel(`${Math.round(a.distanceTo(b))} cm`, 'dim-label measure-label');
  lbl.position.copy(a).lerp(b, 0.5);
  measureGroup.add(lbl);
}

// ---------- pointer interaction ----------
const pointer = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let drag = null;
let look = null;

function setPointer(e) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  ray.far = Infinity;
}
function floorPoint(height = 0) {
  floorPlane.constant = -height;
  return ray.ray.intersectPlane(floorPlane, new THREE.Vector3());
}
function snapPoint(p, shift) {
  if (measuring && measureA && shift) {
    if (Math.abs(p.x - measureA.x) > Math.abs(p.z - measureA.z)) p.z = measureA.z; else p.x = measureA.x;
  }
  p.set(Math.round(p.x), 1, Math.round(p.z));
  return p;
}

renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  setPointer(e);
  if (measuring) {
    const p = floorPoint();
    if (!p) return;
    snapPoint(p, e.shiftKey);
    if (!measureA) { measureA = p; drawMeasure(p, p); } else { drawMeasure(measureA, p); measureA = null; }
    return;
  }
  const hit = ray.intersectObjects(furnitureGroup.children, true).find(h => h.object.userData.itemId);
  if (hit) {
    const id = hit.object.userData.itemId;
    if (id !== selectedId) select(id);
    const it = selected();
    const p = floorPoint();
    if (p) drag = { dx: it.x - p.x, dz: it.z - p.z, moved: false };
    orbit.enabled = pan.enabled = false;
    renderer.domElement.setPointerCapture(e.pointerId);
    return;
  }
  if (mode === 'walk') {
    look = { x: e.clientX, y: e.clientY, yaw: walkCam.rotation.y, pitch: walkCam.rotation.x, moved: false };
    renderer.domElement.setPointerCapture(e.pointerId);
    return;
  }
  look = { x: e.clientX, y: e.clientY, moved: false, deselectOnly: true };
});

renderer.domElement.addEventListener('pointermove', e => {
  setPointer(e);
  if (measuring && measureA) {
    const p = floorPoint();
    if (p) drawMeasure(measureA, snapPoint(p, e.shiftKey));
    return;
  }
  if (drag) {
    const p = floorPoint();
    if (!p) return;
    const it = selected();
    it.x = Math.round(p.x + drag.dx);
    it.z = Math.round(p.z + drag.dz);
    drag.moved = true;
    renderItem(it);
    fillEditor(it);
    updateClearance();
    return;
  }
  if (look) {
    const dx = e.clientX - look.x, dy = e.clientY - look.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) look.moved = true;
    if (!look.deselectOnly) {
      walkCam.rotation.y = look.yaw + dx * 0.004;
      walkCam.rotation.x = THREE.MathUtils.clamp(look.pitch + dy * 0.004, -1.2, 1.2);
    }
  }
});

renderer.domElement.addEventListener('pointerup', () => {
  if (drag) {
    if (drag.moved) { save(); renderList(); }
    drag = null;
    orbit.enabled = mode === 'orbit';
    pan.enabled = mode === 'top';
  }
  if (look && !look.moved && selectedId) select(null);
  look = null;
});

// ---------- keyboard ----------
const keys = new Set();
addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea')) return;
  keys.add(e.code);
  if (e.key === 'Escape') { if (measuring) setMeasuring(false); else select(null); }
  const it = selected();
  if (!it) return;
  const step = e.shiftKey ? 10 : 1;
  const nudge = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (nudge && mode !== 'walk') { e.preventDefault(); update(it, { x: it.x + nudge[0], z: it.z + nudge[1] }); }
  else if (e.key === 'r' || e.key === 'R') rotateSel(e.shiftKey ? -90 : 90);
  else if (e.key === 'q') rotateSel(-15);
  else if (e.key === 'e') rotateSel(15);
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSel(); }
  else if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); duplicateSel(); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// ---------- view modes ----------
const viewBtns = [...document.querySelectorAll('#views button')];
function setMode(m) {
  mode = m;
  viewBtns.forEach(b => b.classList.toggle('on', b.dataset.view === m));
  orbit.enabled = m === 'orbit';
  pan.enabled = m === 'top';
  camera = { orbit: persp, top: ortho, walk: walkCam }[m];
  if (m === 'walk' && !walkCam.userData.placed) {
    walkCam.position.set(300, EYE_H, 330);
    walkCam.rotation.set(-0.05, 0, 0);
    walkCam.userData.placed = true;
  }
  statusEl.textContent = modeHint();
  syncLabels();
  syncWalls();
  const walk = m === 'walk';
  surroundings.visible = walk;
  scene.fog = walk ? walkFog : null;
  sun.position.copy(walk ? SUN_MORNING : SUN_DAY);
  sun.color.set(walk ? '#ffe2bd' : '#fff6e8');
  sun.intensity = walk ? 3 : 2.2;
  resize();
}
viewBtns.forEach(b => b.onclick = () => setMode(b.dataset.view));

const cutaway = document.getElementById('cutaway');
// Walls are only cut down in the 3D/Plan views; Walk always has full-height walls and the ceiling.
function syncWalls() {
  const cut = cutaway.checked && mode !== 'walk';
  buildWalls(cut ? CUT_H : WALL_H);
  ceiling.visible = !cut;
  updateClearance();
}
cutaway.onchange = syncWalls;
const labelsToggle = document.getElementById('labels');
function syncLabels() { labelObjs.forEach(l => { l.visible = labelsToggle.checked && mode !== 'walk'; }); }
labelsToggle.onchange = syncLabels;

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  persp.aspect = walkCam.aspect = w / h;
  persp.updateProjectionMatrix();
  walkCam.updateProjectionMatrix();
  const fit = Math.max(size.z + 150, (size.x + 150) * h / w) / 2;
  if (!ortho.userData.fitted) {
    ortho.zoom = 1;
    ortho.userData.fitted = true;
  }
  ortho.left = -fit * w / h; ortho.right = fit * w / h; ortho.top = fit; ortho.bottom = -fit;
  ortho.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------- loop ----------
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (mode === 'walk') {
    const speed = (keys.has('ShiftLeft') ? 300 : 140) * dt;
    const fwd = new THREE.Vector3(-Math.sin(walkCam.rotation.y), 0, -Math.cos(walkCam.rotation.y));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    if (keys.has('KeyW') || keys.has('ArrowUp')) walkCam.position.addScaledVector(fwd, speed);
    if (keys.has('KeyS') || keys.has('ArrowDown')) walkCam.position.addScaledVector(fwd, -speed);
    if (keys.has('KeyD') || keys.has('ArrowRight')) walkCam.position.addScaledVector(right, speed);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) walkCam.position.addScaledVector(right, -speed);
  }
  if (mode === "orbit") orbit.update(); else if (mode === "top") pan.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}

async function syncFromFile() {
  if (drag || savePending || !canSaveFile) return;
  try {
    const r = await fetch('furniture.json');
    if (!r.ok) return;
    const text = await r.text();
    if (lastFile === null || text.trim() === lastFile.trim()) return;
    lastFile = text;
    items = JSON.parse(text).items || [];
    if (!selected()) { selectedId = null; editor.style.display = 'none'; }
    renderAll();
    if (selected()) fillEditor(selected());
    setStatus('Updated from furniture.json');
  } catch {}
}
setInterval(syncFromFile, 2000);

buildWalls(WALL_H);
await load();
resize();
renderAll();
setMode('orbit');
tick();
window.__home = { get items() { return items; }, scene, select, setMode, walkCam };
