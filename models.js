// Simple parametric furniture models. All sizes in cm.
// Each model sits on the floor (y = 0) centred on the origin; w runs along x, d along z, h up.
// The "front" of an item faces +z (towards the bottom of the floor plan when rot = 0).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PRESETS = [
  { type: 'sofa', name: 'Sofa 3-seat', w: 220, d: 95, h: 85, color: '#7d8b99' },
  { type: 'lsofa', name: 'Corner sofa (chaise)', w: 321, d: 170, h: 73, color: '#7a6e63' },
  { type: 'cornersofa', name: 'Corner sofa (L)', w: 385, d: 245, h: 73, color: '#7a6e63' },
  { type: 'sofa', name: 'Sofa 2-seat', w: 170, d: 90, h: 85, color: '#7d8b99' },
  { type: 'armchair', name: 'Armchair', w: 85, d: 85, h: 90, color: '#b8875a' },
  { type: 'table', name: 'Coffee table', w: 110, d: 60, h: 45, color: '#8a6440' },
  { type: 'table', name: 'Dining table', w: 180, d: 90, h: 75, color: '#a07850' },
  { type: 'roundtable', name: 'Round table Ø110', w: 110, d: 110, h: 75, color: '#a07850' },
  { type: 'chair', name: 'Dining chair', w: 45, d: 52, h: 85, color: '#3d3d3d' },
  { type: 'cabinet', name: 'TV unit', w: 180, d: 40, h: 50, color: '#d8d2c8' },
  { type: 'tv', name: 'TV 55"', w: 123, d: 6, h: 71, color: '#151515', elevation: 55 },
  { type: 'shelf', name: 'Bookcase', w: 80, d: 30, h: 200, color: '#efeae2' },
  { type: 'boxspring', name: 'Box-spring bed 180×200', w: 180, d: 208, h: 125, sleepH: 65, color: '#cfc7bb' },
  { type: 'bed', name: 'Double bed 160×200', w: 160, d: 210, h: 100, color: '#c9bfae' },
  { type: 'bed', name: 'Double bed 180×200', w: 180, d: 210, h: 100, color: '#c9bfae' },
  { type: 'bed', name: 'Single bed 90×200', w: 90, d: 210, h: 90, color: '#c9bfae' },
  { type: 'cabinet', name: 'Nightstand', w: 45, d: 40, h: 50, color: '#d8d2c8' },
  { type: 'openwardrobe', name: 'Open wardrobe 200', w: 200, d: 61.3, h: 237, modules: [100, 100], color: '#6f6d69' },
  { type: 'wardrobe', name: 'Wardrobe 200', w: 200, d: 60, h: 236, color: '#f1eee8' },
  { type: 'wardrobe', name: 'Wardrobe 100', w: 100, d: 60, h: 201, color: '#f1eee8' },
  { type: 'cabinet', name: 'Dresser', w: 120, d: 48, h: 80, color: '#d8d2c8' },
  { type: 'table', name: 'Desk', w: 140, d: 70, h: 75, color: '#e9e4dc' },
  { type: 'chair', name: 'Office chair', w: 60, d: 60, h: 110, color: '#2d2d2d' },
  { type: 'rug', name: 'Rug 200×300', w: 300, d: 200, h: 1, color: '#b9a891' },
  { type: 'rug', name: 'Rug 160×230', w: 230, d: 160, h: 1, color: '#9aa79a' },
  { type: 'plant', name: 'Plant', w: 50, d: 50, h: 140, color: '#4f7a4a' },
  { type: 'lamp', name: 'Floor lamp', w: 40, d: 40, h: 160, color: '#e8e0cf' },
  { type: 'box', name: 'Box (custom)', w: 100, d: 50, h: 50, color: '#b0b8c0' },
];

export const TYPES = ['box', 'sofa', 'lsofa', 'cornersofa', 'armchair', 'table', 'roundtable', 'chair', 'cabinet', 'tv',
  'shelf', 'bed', 'boxspring', 'wardrobe', 'openwardrobe', 'rug', 'plant', 'lamp'];

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return matCache.get(key);
}

function rnd(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function shade(color, f) {
  return '#' + new THREE.Color(color).multiplyScalar(f).getHexString();
}

function box(g, w, h, d, x, y, z, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1)), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}

function rbox(g, x0, x1, y0, y1, z0, z1, color, r = 10) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 0.1, h / 2 - 0.1, d / 2 - 0.1)), mat(color));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}

function cyl(g, rTop, rBot, h, x, y, z, color, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}

function legs(g, w, d, legH, inset, size, color) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(g, size, legH, size, sx * (w / 2 - inset - size / 2), 0, sz * (d / 2 - inset - size / 2), color);
  }
}

const BUILDERS = {
  box(g, { w, d, h, color }) { box(g, w, h, d, 0, 0, 0, color); },

  sofa(g, { w, d, h, color }) {
    const arm = Math.min(20, w * 0.12), seatH = Math.min(45, h * 0.5), back = Math.min(22, d * 0.25);
    const dark = shade(color, 0.85);
    box(g, w, seatH - 12, d, 0, 4, 0, dark);
    box(g, w - 2 * arm, 14, d - back, 0, seatH - 10, back / 2, color);
    box(g, w, h - 4, back, 0, 4, -d / 2 + back / 2, color);
    box(g, arm, h * 0.72 - 4, d, -w / 2 + arm / 2, 4, 0, dark);
    box(g, arm, h * 0.72 - 4, d, w / 2 - arm / 2, 4, 0, dark);
    legs(g, w, d, 4, 4, 5, '#2a2a2a');
  },

  armchair(g, item) { BUILDERS.sofa(g, item); },

  table(g, { w, d, h, color }) {
    box(g, w, 3, d, 0, h - 3, 0, color);
    legs(g, w, d, h - 3, 4, 5, shade(color, 0.7));
  },

  // baseD set = solid pedestal of that diameter; otherwise a thin stem on a foot plate.
  roundtable(g, { w, h, color, topT = 3, baseD }) {
    cyl(g, w / 2, w / 2, topT, 0, h - topT, 0, color, 48);
    if (baseD) { cyl(g, baseD / 2, baseD / 2, h - topT, 0, 0, 0, shade(color, 0.92), 48); return; }
    cyl(g, 4, 4, h - topT, 0, 0, 0, shade(color, 0.7));
    cyl(g, w / 5, w / 5, 2, 0, 0, 0, shade(color, 0.7));
  },

  chair(g, { w, d, h, color }) {
    const seat = Math.min(46, h * 0.55);
    box(g, w, 5, d, 0, seat - 5, 0, color);
    legs(g, w, d, seat - 5, 2, 3, shade(color, 0.7));
    box(g, w, h - seat, 4, 0, seat, -d / 2 + 2, color);
  },

  cabinet(g, { w, d, h, color }) {
    box(g, w, h - 8, d, 0, 8, 0, color);
    legs(g, w, d, 8, 3, 3, '#3a3a3a');
    const doors = Math.max(1, Math.round(w / 50));
    for (let i = 1; i < doors; i++) box(g, 0.6, h - 12, 0.4, -w / 2 + (w / doors) * i, 10, d / 2, shade(color, 0.6));
  },

  wardrobe(g, { w, d, h, color }) {
    box(g, w, h, d, 0, 0, 0, color);
    const doors = Math.max(1, Math.round(w / 50));
    for (let i = 1; i < doors; i++) box(g, 0.6, h - 4, 0.4, -w / 2 + (w / doors) * i, 2, d / 2, shade(color, 0.6));
    for (let i = 0; i < doors; i++) {
      const x = -w / 2 + (w / doors) * (i + 0.5) + ((i % 2) ? -w / doors / 2 + 6 : w / doors / 2 - 6);
      box(g, 1.5, 30, 2, x, h / 2 - 15, d / 2 + 1, '#888888');
    }
  },

  shelf(g, { w, d, h, color }) {
    const t = 2;
    box(g, t, h, d, -w / 2 + t / 2, 0, 0, color);
    box(g, t, h, d, w / 2 - t / 2, 0, 0, color);
    box(g, w, h, 1, 0, 0, -d / 2 + 0.5, shade(color, 0.92));
    const n = Math.max(2, Math.round(h / 38));
    for (let i = 0; i <= n; i++) box(g, w - 2 * t, t, d, 0, Math.min(i * (h - t) / n, h - t), 0, color);
  },

  tv(g, { w, d, h, color }) { box(g, w, h, d, 0, 0, 0, color); },

  bed(g, { w, d, h, color }) {
    const head = 8, frameH = 28, mattH = 22;
    box(g, w, frameH, d - head, 0, 0, head / 2, shade(color, 0.75));
    box(g, w - 4, mattH, d - head - 6, 0, frameH, head / 2, '#f4f1ea');
    box(g, w, h, head, 0, 0, -d / 2 + head / 2, color);
    box(g, w - 6, 4, (d - head) * 0.62, 0, frameH + mattH, d * 0.17, color);
    const pillows = w >= 120 ? 2 : 1;
    for (let i = 0; i < pillows; i++) {
      const pw = (w - 20) / pillows - 6;
      box(g, pw, 12, 40, -w / 2 + 10 + (pw + 6) * (i + 0.5) + 3, frameH + mattH, -d / 2 + head + 26, '#ffffff');
    }
  },

  // Continental / box-spring bed: quilted base, mattress, topper, upholstered buttoned headboard.
  // h = headboard height; sleepH = top of the topper.
  boxspring(g, { w, d, h, color, sleepH = 65 }) {
    const head = 8, legH = 6, len = d - head, z = head / 2;
    const topper = 7, mattH = (sleepH - legH - topper) * 0.45, baseH = sleepH - legH - topper - mattH;
    legs(g, w, len, legH, 6, 5, '#3a2f26');
    for (let i = 0; i < 2; i++) box(g, w, baseH / 2 - 0.5, len, 0, legH + i * baseH / 2, z, color);  // two-layer base
    for (let x = -w / 2 + 15; x < w / 2; x += 15) box(g, 0.4, baseH - 2, 0.4, x, legH + 1, z + len / 2, shade(color, 0.8));
    for (const sx of [-1, 1]) for (let zz = -len / 2 + 15; zz < len / 2; zz += 15) {
      box(g, 0.4, baseH - 2, 0.4, sx * w / 2, legH + 1, z + zz, shade(color, 0.8));
    }
    box(g, w - 1, mattH, len - 1, 0, legH + baseH, z, shade(color, 1.06));
    box(g, w - 2, topper, len - 2, 0, legH + baseH + mattH, z, '#efe9de');
    box(g, w, h, head, 0, 0, -d / 2 + head / 2, color);
    for (let y = sleepH + 18; y < h - 10; y += 22) for (let x = -w / 2 + 25; x < w / 2 - 10; x += 32) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), mat(shade(color, 0.7)));
      b.position.set(x, y, -d / 2 + head + 0.2);
      g.add(b);
    }
    const pillows = w >= 120 ? 2 : 1, pw = (w - 30) / pillows - 8;
    for (let i = 0; i < pillows; i++) {
      box(g, pw, 14, 45, -w / 2 + 15 + (pw + 8) * (i + 0.5) + 4, sleepH, -d / 2 + head + 28, '#ffffff');
    }
    box(g, w + 4, 4, len * 0.6, 0, sleepH, z + len * 0.2, '#d9d4cc');
  },

  // Sofa with an optional chaise longue (chaiseW: 0 for a straight sofa). d = overall depth incl. chaise; mainD = depth of the straight part.
  lsofa(g, { w, d, h, color, mainD = 111, seatH = 41.5, seatD = 71, armH = 52, armW = 31, chaiseW = 115, chaiseSide = 'right', seats: nSeats }) {
    const s = chaiseSide === 'left' ? -1 : 1;
    const X = (a, b) => (s > 0 ? [a, b] : [-b, -a]);  // mirror x-ranges for a left-hand chaise
    const back = -d / 2, front = back + mainD, backT = mainD - seatD;
    const endW = Math.max(chaiseW, armW);  // chaiseW <= armW gives a straight sofa with two arms
    const seats = nSeats || Math.max(1, Math.round((w - armW - endW) / 90));
    const seatW = (w - armW - endW) / seats;
    const cushion = shade(color, 1.05);
    if (armW > 0) {  // armW: 0 for an armless chair
      rbox(g, ...X(-w / 2, -w / 2 + armW), 0, armH, back, front, color, 14);
      rbox(g, ...X(w / 2 - armW, w / 2), 0, armH, back, d / 2, color, 14);
    }
    for (let i = 0; i < seats; i++) {
      const x0 = -w / 2 + armW + i * seatW;
      rbox(g, ...X(x0, x0 + seatW), 0, h, back, back + backT, color, 12);
      rbox(g, ...X(x0 + 0.5, x0 + seatW - 0.5), 0, seatH, back + backT - 2, front, cushion, 10);
    }
    if (chaiseW <= armW) return;
    rbox(g, ...X(w / 2 - chaiseW, w / 2 - armW), 0, h, back, back + backT, color, 12);
    rbox(g, ...X(w / 2 - chaiseW + 0.5, w / 2 - armW), 0, seatH, back + backT - 2, d / 2, cushion, 10);
  },

  // Corner sofa: backrest along the back and along the outer side of the return, open end at the front of the return.
  // d = overall depth (length of the return); mainD = depth of the long run; returnSide = which end the return is on.
  cornersofa(g, { w, d, h, color, mainD = 111, seatH = 41.5, seatD = 71, armH = 52, armW = 31, returnSide = 'left' }) {
    const s = returnSide === 'right' ? -1 : 1;
    const X = (a, b) => (s > 0 ? [a, b] : [-b, -a]);  // mirror x-ranges for a right-hand return
    const back = -d / 2, backT = mainD - seatD, left = -w / 2;
    const cushion = shade(color, 1.05);
    // return: outer backrest + seat running to the open end
    rbox(g, ...X(left, left + backT), 0, h, back, d / 2, color, 12);
    rbox(g, ...X(left + backT - 2, left + mainD), 0, seatH, back + backT - 2, d / 2, cushion, 10);
    // long run: backrest, seats, arm at the far end
    const runW = w - mainD - armW, seats = Math.max(1, Math.round(runW / 100)), seatW = runW / seats;
    rbox(g, ...X(left + backT, w / 2 - armW), 0, h, back, back + backT, color, 12);
    for (let i = 0; i < seats; i++) {
      const x0 = left + mainD + i * seatW;
      rbox(g, ...X(x0 + 0.5, x0 + seatW - 0.5), 0, seatH, back + backT - 2, back + mainD, cushion, 10);
    }
    rbox(g, ...X(w / 2 - armW, w / 2), 0, armH, back, back + mainD, color, 14);
  },

  // Open (doorless) wardrobe run built from modules, e.g. modules: [100, 100, 50].
  // 100 cm modules alternate long-hang and double-hang rails; 50 cm modules get shelves and drawers.
  openwardrobe(g, { w, d, h, color, modules = [w], clothes = true }) {
    const t = 1.8, back = -d / 2, front = d / 2, inner = shade(color, 1.12);
    const r = rnd(Math.round(w * 7 + d));
    const garmentColors = ['#1f2a3a', '#e9e4da', '#7b2d2d', '#c9b79c', '#2f2f2f', '#6d7f8c', '#d9c3b0', '#3c5a46', '#b25d3c', '#f2efe9'];
    const hang = (x0, x1, railY, len) => {
      box(g, x1 - x0 - 2, 2, 2, (x0 + x1) / 2, railY, 0, '#b8b8b8');
      if (!clothes) return;
      for (let x = x0 + 4; x < x1 - 4; x += 3 + r() * 3) {
        const gl = len * (0.7 + r() * 0.3);
        box(g, 1.6, gl, d - 14, x, railY - gl, 2, garmentColors[Math.floor(r() * garmentColors.length)]);
      }
    };
    box(g, w, h, 0.8, 0, 0, back + 0.4, inner);  // back panel
    let x = -w / 2;
    modules.forEach((mw, i) => {
      const x0 = x, x1 = x + mw;
      box(g, t, h, d, x0 + t / 2, 0, 0, color);
      box(g, t, h, d, x1 - t / 2, 0, 0, color);
      box(g, mw, 2.5, d, (x0 + x1) / 2, h - 2.5, 0, color);
      box(g, mw, 7, d, (x0 + x1) / 2, 0, 0, color);
      const ix0 = x0 + t, ix1 = x1 - t;
      if (mw <= 60) {
        for (let k = 0; k < 2; k++) box(g, ix1 - ix0 - 1, 20, 1.5, (ix0 + ix1) / 2, 8 + k * 21, front - 0.75, shade(color, 1.05));
        for (let y = 60; y < h - 20; y += 34) {
          box(g, ix1 - ix0, 1.8, d - 2, (ix0 + ix1) / 2, y, 0, inner);
          if (clothes && y + 36 < h) {
            const stackH = 12 + r() * 14;
            box(g, ix1 - ix0 - 10, stackH, d - 26, (ix0 + ix1) / 2, y + 1.8, 2, garmentColors[Math.floor(r() * garmentColors.length)]);
          }
        }
      } else {
        box(g, ix1 - ix0, 1.8, d - 2, (ix0 + ix1) / 2, h - 40, 0, inner);
        if (clothes) for (let k = 0; k < 3; k++) {
          box(g, 28, 14 + r() * 8, d - 24, ix0 + 18 + k * 32, h - 38.2, 2, garmentColors[Math.floor(r() * garmentColors.length)]);
        }
        if (i % 2 === 0) hang(ix0, ix1, h - 48, 110);  // long hang: coats, dresses
        else { hang(ix0, ix1, h - 48, 80); hang(ix0, ix1, h - 48 - 95, 75); }  // double hang: shirts, trousers
        for (let k = 0; k < 4 && clothes; k++) {  // shoes on the base
          box(g, 10, 9, 26, ix0 + 10 + k * 22, 7, 8, ['#2a2a2a', '#7a4b2a', '#e8e2d8', '#8c1f1f'][k]);
        }
      }
      x = x1;
    });
  },

  rug(g, { w, d, h, color }) {
    const m = box(g, w, Math.max(h, 0.6), d, 0, 0.3, 0, color);
    m.castShadow = false;
  },

  plant(g, { w, h, color }) {
    const potH = Math.min(40, h * 0.3);
    cyl(g, w * 0.3, w * 0.24, potH, 0, 0, 0, '#d9d2c5');
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(w / 2, 20, 16), mat(color));
    leaves.scale.y = (h - potH) / w;
    leaves.position.y = potH + (h - potH) / 2;
    leaves.castShadow = true;
    g.add(leaves);
  },

  lamp(g, { w, h, color }) {
    cyl(g, w * 0.35, w * 0.35, 2, 0, 0, 0, '#333333');
    cyl(g, 1.2, 1.2, h - 30, 0, 2, 0, '#333333', 8);
    cyl(g, w * 0.35, w / 2, 30, 0, h - 30, 0, color);
  },
};

export function buildModel(item) {
  const g = new THREE.Group();
  (BUILDERS[item.type] || BUILDERS.box)(g, item);
  return g;
}
