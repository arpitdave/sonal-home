// The bathroom as in the listing photos: warm-grey large-format concrete-look wall tiles to the ceiling,
// anthracite tiles and a tiled bench in the shower, chrome-framed glass shower doors, a wall-hung toilet
// in front of a tiled half-height ledge with a black flush plate, a chrome towel radiator, and a white
// double-basin vanity with wall-mounted chrome taps under a wide mirror. Units in cm (plan x/y -> world x/z).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const H = 257;
// tile surfaces, 3 mm in front of the wall faces computed from the plan walls
const W = 56.8, E = 236, N = 112.4, S = 273.8;            // bathroom
const SW = -28, SE = 46.2;                                  // shower (west of the glass wall)
const DUCT_X = 171.2, DUCT_Z = 139.1;                       // duct boxed into the north-east corner
const GLASS_Z0 = 152.5, GLASS_Z1 = 230.5, OPEN_TOP = 220;   // shower door opening in the x = 52 wall
const DOOR_Z0 = 169, DOOR_Z1 = 259;                         // doorway from the hall in the x = 241 wall

function tileTexture(base, tileW, tileH, seed) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.round(256 * tileH / tileW);
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) {  // very soft concrete mottling
    g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.006 + r() * 0.012})`;
    const rad = 10 + r() * 40;
    g.beginPath(); g.arc(r() * c.width, r() * c.height, rad, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(40,38,36,.35)'; g.lineWidth = 1.5;
  g.strokeRect(1, 1, c.width - 2, c.height - 2);  // grout
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData = { tileW, tileH };
  return t;
}

export function buildBathroom() {
  const group = new THREE.Group();
  const greyTiles = tileTexture('#a29d96', 60, 120, 11);
  const darkTiles = tileTexture('#4b4845', 60, 120, 23);
  const floorTiles = tileTexture('#85807a', 60, 60, 37);
  const white = new THREE.MeshStandardMaterial({ color: '#f4f3f0', roughness: 0.25 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#d9dcde', roughness: 0.15, metalness: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.4 });

  const tiled = (tex, w, h) => {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(w / tex.userData.tileW, h / tex.userData.tileH);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
  };
  // a tiled wall surface: axis 'x' = plane at x = at spanning z a0..a1; 'z' = plane at z = at spanning x a0..a1
  const wall = (axis, at, a0, a1, y0, y1, facing, tex = greyTiles) => {
    const w = a1 - a0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), tiled(tex, w, h));
    if (axis === 'x') { m.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2; m.position.set(at, (y0 + y1) / 2, (a0 + a1) / 2); }
    else { m.rotation.y = facing > 0 ? 0 : Math.PI; m.position.set((a0 + a1) / 2, (y0 + y1) / 2, at); }
    m.receiveShadow = true;
    group.add(m);
  };
  const floor = (x0, x1, z0, z1, tex) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), tiled(tex, x1 - x0, z1 - z0));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, 0.6, (z0 + z1) / 2);
    m.receiveShadow = true;
    group.add(m);
  };
  const box = (x0, x1, y0, y1, z0, z1, m, solid = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.solid = solid;
    group.add(mesh);
    return mesh;
  };
  const rod = (x, y0, y1, z, r, m = chrome) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 12), m);
    c.position.set(x, (y0 + y1) / 2, z);
    group.add(c);
    return c;
  };

  // ---- walls and floors ----
  wall('z', N, W, DUCT_X, 0, H, 1);
  wall('x', DUCT_X, N, DUCT_Z, 0, H, -1);
  wall('z', DUCT_Z, DUCT_X, E, 0, H, 1);
  wall('x', E, DUCT_Z, DOOR_Z0 - 7, 0, H, -1);
  wall('x', E, DOOR_Z1 + 7, S, 0, H, -1);
  wall('x', E, DOOR_Z0 - 7, DOOR_Z1 + 7, OPEN_TOP + 7, H, -1);
  wall('z', S, W, E, 0, H, -1);
  wall('x', W, N, GLASS_Z0, 0, H, 1);
  wall('x', W, GLASS_Z1, S, 0, H, 1);
  wall('x', W, GLASS_Z0, GLASS_Z1, OPEN_TOP, H, 1);
  wall('x', SW, N, S, 0, H, 1, darkTiles);
  wall('z', N, SW, SE, 0, H, 1, darkTiles);
  wall('z', S, SW, SE, 0, H, -1, darkTiles);
  wall('x', SE, N, GLASS_Z0, 0, H, -1, darkTiles);
  wall('x', SE, GLASS_Z1, S, 0, H, -1, darkTiles);
  wall('x', SE, GLASS_Z0, GLASS_Z1, OPEN_TOP, H, -1, darkTiles);
  floor(W, E, DUCT_Z, S, floorTiles);
  floor(W, DUCT_X, N, DUCT_Z, floorTiles);
  floor(SW, SE, N, S, floorTiles);

  // ---- shower: chrome frame on the glass doors, rail shower, thermostat, linear drain, tiled bench ----
  for (const z of [GLASS_Z0 + 1, (GLASS_Z0 + GLASS_Z1) / 2, GLASS_Z1 - 1]) box(50.5, 53.5, 0, 200, z - 1, z + 1, chrome, false);
  box(50.5, 53.5, 198, 200, GLASS_Z0, GLASS_Z1, chrome, false);
  for (const dz of [-6, 6]) box(53.5, 55, 100, 118, (GLASS_Z0 + GLASS_Z1) / 2 + dz - 0.6, (GLASS_Z0 + GLASS_Z1) / 2 + dz + 0.6, chrome, false);
  const sz = (N + S) / 2 - 10;
  box(SW, SW + 4, 105, 112, sz - 16, sz + 16, chrome, false);         // thermostat bar
  rod(SW + 3, 112, 200, sz, 1.1);                                      // slide rail
  const head = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1.5, 24), chrome);
  head.rotation.z = Math.PI / 2 - 0.5;
  head.position.set(SW + 8, 192, sz);
  group.add(head);
  box(SW + 4, SE - 4, 0.6, 1.4, N + 4, N + 9, chrome, false);          // linear drain
  box(SW, SE, 0, 45, S - 38, S, tiled(darkTiles, SE - SW, 45));        // tiled bench

  // ---- toilet: tiled half-height ledge with shelf + black flush plate, wall-hung bowl ----
  const ledgeTop = 118;
  box(W, 161.5, 0, ledgeTop, N, 132, tiled(greyTiles, 104, ledgeTop));
  box(W, 162.5, ledgeTop, ledgeTop + 2, N, 133, tiled(greyTiles, 104, 21));
  box(98, 120, 88, 103, 132, 132.8, black, false);
  const bowl = new THREE.Mesh(new RoundedBoxGeometry(37, 18, 54, 4, 6), white);
  bowl.position.set(108, 33, 132 + 27);
  bowl.castShadow = true;
  bowl.userData.solid = true;
  group.add(bowl);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(36, 3, 50, 3, 1.4), white);
  seat.position.set(108, 43.5, 132 + 26);
  group.add(seat);

  // ---- chrome towel radiator on the duct ----
  const rz = DUCT_Z + 6;
  for (const x of [184, 226]) rod(x, 30, 172, rz, 1.6);
  for (let y = 36; y <= 168; y += 7) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 42, 8), chrome);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(205, y, rz);
    group.add(bar);
  }
  for (const x of [186, 224]) box(x - 1, x + 1, 120, 122, DUCT_Z, rz, chrome, false);

  // ---- vanity: wall-hung white drawer unit with a double trough basin, wall taps, mirror ----
  const vx0 = 95, vx1 = 215, vz0 = S - 46;
  box(vx0, vx1, 40, 84, vz0, S, white);
  box(vx0 + 1, vx1 - 1, 61.6, 62.4, vz0 - 0.3, vz0, black, false);    // drawer split
  box(vx0 + 1, vx1 - 1, 82, 82.8, vz0 - 0.3, vz0, black, false);
  box(vx0 - 1, vx1 + 1, 84, 92, vz0 - 2, S, white);                   // solid-surface top
  box(vx0 + 6, vx1 - 6, 89, 92.2, vz0 + 5, S - 8, new THREE.MeshStandardMaterial({ color: '#e4e2de', roughness: 0.3 }), false);
  for (const x of [125, 185]) {
    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1, 16), chrome);
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(x, 108, S - 0.5);
    group.add(rosette);
    box(x - 1, x + 1, 107, 109.5, S - 20, S, chrome, false);          // spout
    box(x - 1, x + 1, 102, 109.5, S - 20, S - 18, chrome, false);
    box(x + 6, x + 8, 108, 116, S - 3, S, chrome, false);             // lever
  }
  box(vx0 - 1, vx1 + 1, 118, 200, S - 1.2, S - 0.6, new THREE.MeshStandardMaterial({ color: '#a9b0b3', roughness: 0.05, metalness: 0.3 }), false);
  const mirror = new Reflector(new THREE.PlaneGeometry(vx1 - vx0, 82), { clipBias: 0.003, textureWidth: 1024, textureHeight: 768, color: 0xc8cccd });
  mirror.rotation.y = Math.PI;
  mirror.position.set((vx0 + vx1) / 2, 159, S - 1.4);
  mirror.visible = false;  // the live reflection only runs in Walk view
  group.add(mirror);
  box(216, 222, 106, 116, S - 2, S, black, false);                    // soap holder
  box(224, 236, 104, 112, S - 0.8, S, black, false);                  // double socket

  return { group, mirror };
}
