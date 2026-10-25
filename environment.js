// Surroundings for the Walk view: the street in front (bedroom side, +z) and the green
// courtyard of back gardens behind the balcony (-z). Nothing here casts shadows, so the
// sun always reaches the apartment. Units are cm; street level is y = -300 (1st floor flat).
import * as THREE from 'three';

const GROUND = -300;

function rnd(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

const mats = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts }));
  return mats.get(key);
}

function box(g, x0, x1, y0, y1, z0, z1, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  g.add(m);
  return m;
}

// Canal-house style facade: brick, tall white-framed windows, cornice, door on the ground floor.
function facadeTexture(r, back) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 1024;
  const g = c.getContext('2d');
  const bricks = ['#7d3f2e', '#8a4b35', '#6e3a2c', '#9a6a4a', '#5f4a42', '#a0523a'];
  const base = bricks[Math.floor(r() * bricks.length)];
  g.fillStyle = base; g.fillRect(0, 0, 512, 1024);
  for (let y = 0; y < 1024; y += 6) for (let x = (y / 6) % 2 ? 0 : 8; x < 512; x += 16) {
    g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.07})`;
    g.fillRect(x, y, 15, 5);
  }
  g.fillStyle = '#e9e4da'; g.fillRect(0, 0, 512, 40);  // cornice
  const floors = 4, fh = (1024 - 60) / floors, cols = 3;
  for (let f = 0; f < floors; f++) {
    const top = 60 + f * fh, ground = f === floors - 1;
    for (let i = 0; i < cols; i++) {
      const cw = 512 / cols, wx = i * cw + cw * 0.22, ww = cw * 0.56;
      const wy = top + fh * (ground ? 0.12 : 0.15), wh = fh * (ground ? 0.8 : 0.68);
      if (ground && i === 0 && !back) {  // front door
        g.fillStyle = ['#1f3b2f', '#2b2b2b', '#5a1f1f'][Math.floor(r() * 3)];
        g.fillRect(wx, wy + wh * 0.1, ww, wh * 0.9);
        continue;
      }
      g.fillStyle = '#f4f2ee'; g.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
      const sky = g.createLinearGradient(0, wy, 0, wy + wh);
      sky.addColorStop(0, '#9fb6c6'); sky.addColorStop(1, '#3c4a55');
      g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
      if (r() < 0.4) { g.fillStyle = 'rgba(240,235,225,.85)'; g.fillRect(wx, wy, ww * (0.2 + r() * 0.3), wh); }
      g.fillStyle = '#f4f2ee';
      g.fillRect(wx + ww / 2 - 3, wy, 6, wh);
      g.fillRect(wx, wy + wh * 0.3, ww, 6);
    }
    g.fillStyle = 'rgba(230,225,215,.6)'; g.fillRect(0, top + fh - 6, 512, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { texture: t, base };
}

// A row of houses along x; facing = +1 (front looks towards +z) or -1 (towards -z).
function houseRow(g, r, z0, depth, facing, back) {
  const variants = Array.from({ length: 6 }, () => facadeTexture(r, back));
  for (let x = -3000; x < 3600;) {
    const w = 520 + Math.floor(r() * 160), h = 1150 + Math.floor(r() * 200);
    const v = variants[Math.floor(r() * variants.length)];
    const side = mat(v.base);
    const front = new THREE.MeshStandardMaterial({ map: v.texture, roughness: 0.85 });
    const faces = [side, side, mat('#4b4744'), side, side, side];
    faces[facing > 0 ? 4 : 5] = front;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w - 4, h, depth), faces);
    m.position.set(x + w / 2, GROUND + h / 2, z0 + facing * -depth / 2);
    g.add(m);
    if (back) {  // balconies on the upper floors, many with plants
      const fh = (1 - 60 / 1024) / 4;
      for (let f = 0; f < 3; f++) {
        if (r() < 0.25) continue;
        const y = GROUND + h * (1 - 60 / 1024 - (f + 1) * fh);
        balcony(g, r, x + 40, x + w - 40, y, z0, facing);
      }
    }
    x += w;
  }
}

function balcony(g, r, x0, x1, y, z0, facing) {
  const z1 = z0 + facing * (130 + r() * 60);
  const [za, zb] = [Math.min(z0, z1), Math.max(z0, z1)];
  box(g, x0, x1, y - 15, y, za, zb, mat('#cfcac2'));
  const rail = mat(r() < 0.5 ? '#2a2a2a' : '#e8e6e1');
  box(g, x0, x1, y + 100, y + 104, z1 - 2, z1 + 2, rail);
  for (let x = x0; x <= x1; x += 12) box(g, x - 1, x + 1, y, y + 100, z1 - 1, z1 + 1, rail);
  for (const x of [x0, x1]) box(g, x - 2, x + 2, y + 100, y + 104, za, zb, rail);
  const greens = ['#4f7a3a', '#5d8a43', '#6b9550', '#7aa35a'];
  const pots = Math.floor(r() * 4);
  for (let i = 0; i < pots; i++) {
    const px = x0 + 30 + r() * (x1 - x0 - 60), pz = (za + zb) / 2 + (r() - 0.5) * 60, size = 20 + r() * 35;
    box(g, px - 14, px + 14, y, y + 30, pz - 14, pz + 14, mat('#b86b4b'));
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), mat(greens[Math.floor(r() * greens.length)], { flatShading: true }));
    leaf.position.set(px, y + 30 + size * 0.8, pz);
    g.add(leaf);
  }
  if (r() < 0.4) box(g, x0 + 40, x0 + 100, y, y + 45, za + 20, za + 70, mat('#3a3a3a'));  // little table or bench
}

function tree(g, r, x, z, height) {
  const trunkH = height * 0.45;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(10 + height / 120, 16 + height / 90, trunkH, 8), mat('#5a4636'));
  trunk.position.set(x, GROUND + trunkH / 2, z);
  g.add(trunk);
  const greens = ['#4f7a3a', '#5d8a43', '#3f6b34', '#6b9550', '#47703c'];
  const crown = height * 0.3;
  for (let i = 0; i < 4; i++) {
    const rad = crown * (0.55 + r() * 0.45);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1),
      mat(greens[Math.floor(r() * greens.length)], { flatShading: true }));
    leaf.position.set(x + (r() - 0.5) * crown, GROUND + trunkH + crown * 0.4 + r() * crown * 0.9, z + (r() - 0.5) * crown);
    leaf.scale.y = 0.85;
    g.add(leaf);
  }
}

function car(g, r, x, z) {
  const colors = ['#2e3640', '#8c8f93', '#e6e6e3', '#1d1d1f', '#6b2a2a', '#30475e'];
  const body = mat(colors[Math.floor(r() * colors.length)], { roughness: 0.4, metalness: 0.3 });
  box(g, x - 210, x + 210, GROUND + 25, GROUND + 95, z - 88, z + 88, body);
  box(g, x - 120, x + 100, GROUND + 95, GROUND + 148, z - 78, z + 78, mat('#28323a', { roughness: 0.2, metalness: 0.5 }));
  for (const dx of [-140, 140]) for (const dz of [-80, 80]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 20, 16), mat('#151515'));
    w.rotation.x = Math.PI / 2;
    w.position.set(x + dx, GROUND + 32, z + dz);
    g.add(w);
  }
}

function bike(g, r, x, z) {
  const frame = mat(['#1b1b1b', '#2f4f6f', '#7a2a2a', '#d8d2c4'][Math.floor(r() * 4)], { roughness: 0.5 });
  for (const dx of [-55, 55]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(33, 2.5, 6, 24), mat('#111111'));
    wheel.position.set(x + dx, GROUND + 35, z);
    g.add(wheel);
  }
  box(g, x - 55, x + 55, GROUND + 55, GROUND + 59, z - 2, z + 2, frame);
  box(g, x + 30, x + 34, GROUND + 35, GROUND + 100, z - 2, z + 2, frame);
  box(g, x - 25, x - 21, GROUND + 35, GROUND + 92, z - 2, z + 2, frame);
  box(g, x + 22, x + 42, GROUND + 100, GROUND + 103, z - 25, z + 25, frame);
}

export function buildEnvironment({ x0, x1, zBack, zFront, floorTop }) {
  const env = new THREE.Group();
  const r = rnd(42);
  const brick = mat('#f7f5f1');  // same off-white as the apartment walls

  // our own building: neighbours left and right, the flats above and below
  box(env, -3000, x0, GROUND, 1000, zBack, zFront, brick);
  box(env, x1, 3600, GROUND, 1000, zBack, zFront, brick);
  box(env, x0, x1, floorTop, 1000, zBack, zFront, brick);
  box(env, x0, x1, GROUND, -31, zBack, zFront, brick);
  // neighbours' balconies at our level
  for (let x = -3000; x < 3600; x += 590) {
    if (x + 590 > x0 && x < x1) continue;
    box(env, x + 20, x + 570, -31, 0, zBack - 212, zBack, mat('#bdb8b0'));
    box(env, x + 20, x + 570, 95, 100, zBack - 212, zBack - 207, mat('#333333'));
  }

  // ---- street side (+z) ----
  const sidewalk = mat('#a39a90'), road = mat('#4a4a4d', { roughness: 1 });
  box(env, -3000, 3600, GROUND, GROUND + 15, zFront, zFront + 260, sidewalk);
  box(env, -3000, 3600, GROUND - 1, GROUND + 1, zFront + 260, zFront + 960, road);
  box(env, -3000, 3600, GROUND, GROUND + 15, zFront + 960, zFront + 1220, sidewalk);
  for (let x = -2600; x < 3200; x += 480 + r() * 200) car(env, r, x, zFront + 360);
  for (let x = -2400; x < 3200; x += 700 + r() * 300) car(env, r, x, zFront + 860);
  for (let x = -1800; x < 2600; x += 90 + r() * 260) if (r() < 0.6) bike(env, r, x, zFront + 200);
  for (let x = -1950; x < 3200; x += 1400) {  // street lamps, kept clear of our windows
    box(env, x - 5, x + 5, GROUND, GROUND + 520, zFront + 240, zFront + 250, mat('#2d2d2d'));
    box(env, x - 25, x + 25, GROUND + 500, GROUND + 520, zFront + 220, zFront + 270, mat('#2d2d2d'));
  }
  houseRow(env, r, zFront + 1220, 1000, -1, false);

  // ---- back gardens (-z): lawns, fences, hedges, sheds, lots of trees ----
  const courtFar = zBack - 2400;
  box(env, -3000, 3600, GROUND - 1, GROUND + 1, courtFar, zBack, mat('#6f8f4f', { roughness: 1 }));
  for (let x = -3000; x < 3600; x += 590) {
    for (const [za, zb] of [[zBack - 1150, zBack], [courtFar, courtFar + 1150]]) {
      box(env, x + 10, x + 580, GROUND + 1, GROUND + 2, za + 10, zb - 10,
        mat(['#78985a', '#6a8a4c', '#839f63', '#9a9a86'][Math.floor(r() * 4)], { roughness: 1 }));
      box(env, x - 2, x + 2, GROUND, GROUND + 180, za, zb, mat('#8a7560'));
      if (r() < 0.5) box(env, x + 20, x + 90, GROUND, GROUND + 160, za + 100, zb - 300, mat('#3f6a33'));
      if (r() < 0.3) box(env, x + 300, x + 520, GROUND, GROUND + 230, (za + zb) / 2 - 100, (za + zb) / 2 + 100, mat('#8a7a66'));
    }
  }
  box(env, -3000, 3600, GROUND, GROUND + 180, zBack - 1152, zBack - 1148, mat('#8a7560'));
  // garden-sized trees (mostly below balcony height) and shrubs, so the yards and balconies stay visible
  for (let i = 0; i < 16; i++) {
    tree(env, r, -2800 + r() * 6200, zBack - 600 - r() * 1700, 300 + r() * 380);
  }
  const shrubGreens = ['#4f7a3a', '#5d8a43', '#6b9550', '#7aa35a', '#3f6b34'];
  for (let i = 0; i < 70; i++) {
    const size = 35 + r() * 60;
    const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1),
      mat(shrubGreens[Math.floor(r() * shrubGreens.length)], { flatShading: true }));
    const nearHalf = r() < 0.5;
    shrub.position.set(-2800 + r() * 6200, GROUND + size * 0.6, nearHalf ? zBack - 200 - r() * 900 : courtFar + 200 + r() * 900);
    shrub.scale.y = 0.75;
    env.add(shrub);
  }
  houseRow(env, r, courtFar, 1000, 1, true);

  // ---- sky ----
  const skyGeo = new THREE.SphereGeometry(18000, 32, 16);
  const colors = [], top = new THREE.Color('#6fa6d8'), horizon = new THREE.Color('#e7eef2');
  const pos = skyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i) / 18000);
    const c = horizon.clone().lerp(top, Math.pow(t, 0.6));
    colors.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  env.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));

  env.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return env;
}
