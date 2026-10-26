// The installed kitchen (from the listing photos) and small built-in details like ceiling spots.
// L-shaped kitchen: high-gloss white handleless units, black stone worktop, bevelled white subway
// tiles, gas hob over a stainless oven with an angled black-glass hood, a tall built-in fridge column
// at the balcony end, and the sink on the short leg. Units in cm; plan x -> world x, plan y -> world z.
import * as THREE from 'three';

const WALL_X = -28.5;    // inner face of the west wall (long leg of the L)
const WALL_Z = 101.5;    // inner face of the bathroom wall (short leg of the L)
const BASE_D = 60, UPPER_D = 35, PLINTH = 10, TOP_Y = 90, WORKTOP = 4;
const UPPER_Y0 = 145, UPPER_Y1 = 220;
const FRIDGE_Z0 = -184, FRIDGE_Z1 = -124;   // tall fridge column
const HOB_Z0 = -94, HOB_Z1 = -34;           // hob over the oven
const RUN_X1 = 162;                         // end of the short leg

function tileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d6d0'; g.fillRect(0, 0, 512, 512);
  const tw = 128, th = 64;  // 15 x 7.5 cm tiles on a 60 cm texture
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 5; col++) {
      const x = col * tw + (row % 2 ? tw / 2 : 0), y = row * th;
      const grad = g.createLinearGradient(x, y, x, y + th);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#f6f5f2'); grad.addColorStop(1, '#e6e4df');
      g.fillStyle = grad;
      g.fillRect(x + 3, y + 3, tw - 6, th - 6);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3;
      g.strokeRect(x + 7, y + 7, tw - 14, th - 14);  // bevel highlight
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildKitchen() {
  const k = new THREE.Group();
  const gloss = new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.18, metalness: 0.05 });
  const gap = new THREE.MeshStandardMaterial({ color: '#9b9891', roughness: 0.6 });
  const stone = new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: '#c6c9cc', roughness: 0.35, metalness: 0.35 });  // no env map, so keep metalness low
  const blackGlass = new THREE.MeshStandardMaterial({ color: '#141617', roughness: 0.08, metalness: 0.4 });
  const darkGlass = new THREE.MeshStandardMaterial({ color: '#232527', roughness: 0.1, metalness: 0.2 });
  const iron = new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.6 });
  const led = new THREE.MeshStandardMaterial({ color: '#fff6e6', emissive: '#ffe2b0', emissiveIntensity: 1.2 });

  const box = (x0, x1, y0, y1, z0, z1, m, solid = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.solid = solid;
    k.add(mesh);
    return mesh;
  };

  const frontX = WALL_X + BASE_D, frontZ = WALL_Z - BASE_D;

  // ---- long leg along the west wall: fridge column, narrow unit, oven + hob, corner unit ----
  box(WALL_X, frontX, 0, UPPER_Y1, FRIDGE_Z0, FRIDGE_Z1, gloss);
  box(frontX, frontX + 0.3, 128, 128.6, FRIDGE_Z0 + 1, FRIDGE_Z1 - 1, gap);                       // door split
  box(frontX, frontX + 0.3, 2, 9, FRIDGE_Z0 + 8, FRIDGE_Z1 - 8, iron);                             // vent grille
  box(WALL_X, frontX - 4, 0, PLINTH, FRIDGE_Z1, WALL_Z, gloss);                                    // plinth
  box(WALL_X, frontX, PLINTH, TOP_Y - WORKTOP, FRIDGE_Z1, WALL_Z, gloss);                          // base carcass
  for (const z of [HOB_Z0, HOB_Z1]) box(frontX, frontX + 0.3, PLINTH, TOP_Y - WORKTOP, z - 0.3, z + 0.3, gap);
  box(frontX, frontX + 0.3, 60, 60.6, FRIDGE_Z1 + 1, HOB_Z0 - 1, gap);                             // drawer split
  box(frontX, frontX + 1.5, 31, TOP_Y - WORKTOP - 2, HOB_Z0 + 1, HOB_Z1 - 1, steel);               // oven
  box(frontX + 1.5, frontX + 1.8, 36, 66, HOB_Z0 + 6, HOB_Z1 - 6, darkGlass);                      // oven window
  box(frontX + 1.5, frontX + 4, 70, 71.5, HOB_Z0 + 8, HOB_Z1 - 8, steel);                          // oven handle
  box(frontX + 1.5, frontX + 2, 74, 81, HOB_Z0 + 22, HOB_Z1 - 22, darkGlass);                      // display
  box(WALL_X, frontX + 2, TOP_Y - WORKTOP, TOP_Y, FRIDGE_Z1, WALL_Z, stone);                       // worktop
  box(WALL_X + 8, frontX - 6, TOP_Y, TOP_Y + 0.6, HOB_Z0 + 4, HOB_Z1 - 4, steel);                  // gas hob
  for (const [dx, dz] of [[-12, -13], [-12, 13], [12, -13], [12, 13]]) {
    const cx = (WALL_X + frontX) / 2 + dx, cz = (HOB_Z0 + HOB_Z1) / 2 + dz;
    box(cx - 9, cx + 9, TOP_Y + 0.6, TOP_Y + 2.2, cz - 0.8, cz + 0.8, iron, false);
    box(cx - 0.8, cx + 0.8, TOP_Y + 0.6, TOP_Y + 2.2, cz - 9, cz + 9, iron, false);
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 1.2, 16), iron);
    burner.position.set(cx, TOP_Y + 1.2, cz);
    k.add(burner);
  }

  // ---- short leg along the bathroom wall, with the sink ----
  box(frontX, RUN_X1, 0, PLINTH, frontZ + 4, WALL_Z, gloss);
  box(frontX, RUN_X1, PLINTH, TOP_Y - WORKTOP, frontZ, WALL_Z, gloss);
  box(RUN_X1, RUN_X1 + 2, 0, TOP_Y - WORKTOP, frontZ, WALL_Z, gloss);                               // end panel
  for (const x of [frontX + 1, 77, 120]) box(x - 0.3, x + 0.3, PLINTH, TOP_Y - WORKTOP, frontZ - 0.3, frontZ, gap);
  box(frontX, RUN_X1 + 2, TOP_Y - WORKTOP, TOP_Y, frontZ - 2, WALL_Z, stone);
  const sinkX = 98, sinkZ = frontZ + 28;
  box(sinkX - 24, sinkX + 24, TOP_Y - 0.2, TOP_Y + 0.15, sinkZ - 20, sinkZ + 20, steel, false);
  box(sinkX - 20, sinkX + 20, TOP_Y - 0.1, TOP_Y + 0.2, sinkZ - 17, sinkZ + 15, darkGlass, false);  // bowl shadow
  const tapX = sinkX + 2, tapZ = WALL_Z - 9;
  box(tapX - 1.4, tapX + 1.4, TOP_Y, TOP_Y + 30, tapZ - 1.4, tapZ + 1.4, steel, false);
  box(tapX - 1.1, tapX + 1.1, TOP_Y + 27, TOP_Y + 29.5, tapZ - 20, tapZ, steel, false);
  box(tapX - 13, tapX - 11, TOP_Y, TOP_Y + 22, tapZ - 1, tapZ + 1, steel, false);                  // filter tap

  // ---- subway tile backsplash ----
  const tiles = tileTexture();
  const tileMat = (len) => {
    const t = tiles.clone();
    t.needsUpdate = true;
    t.repeat.set(len / 60, (UPPER_Y0 - TOP_Y) / 60);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.25 });
  };
  const westLen = WALL_Z - FRIDGE_Z1, southLen = RUN_X1 - WALL_X;
  const westTiles = new THREE.Mesh(new THREE.PlaneGeometry(westLen, UPPER_Y0 - TOP_Y), tileMat(westLen));
  westTiles.rotation.y = Math.PI / 2;
  westTiles.position.set(WALL_X + 0.3, (TOP_Y + UPPER_Y0) / 2, (FRIDGE_Z1 + WALL_Z) / 2);
  const southTiles = new THREE.Mesh(new THREE.PlaneGeometry(southLen, UPPER_Y0 - TOP_Y), tileMat(southLen));
  southTiles.rotation.y = Math.PI;
  southTiles.position.set((WALL_X + RUN_X1) / 2, (TOP_Y + UPPER_Y0) / 2, WALL_Z - 0.3);
  for (const t of [westTiles, southTiles]) { t.receiveShadow = true; k.add(t); }

  // ---- wall cabinets (none over the hob: the hood goes there) ----
  const upperX = WALL_X + UPPER_D, upperZ = WALL_Z - UPPER_D;
  box(WALL_X, upperX, UPPER_Y0, UPPER_Y1, FRIDGE_Z1, HOB_Z0, gloss);
  box(WALL_X, upperX, UPPER_Y0, UPPER_Y1, HOB_Z1, WALL_Z, gloss);
  box(upperX, RUN_X1 + 2, UPPER_Y0, UPPER_Y1, upperZ, WALL_Z, gloss);
  for (const z of [5, 40]) box(upperX, upperX + 0.3, UPPER_Y0, UPPER_Y1, z - 0.3, z + 0.3, gap);
  for (const x of [upperX + 1, 75, 120]) box(x - 0.3, x + 0.3, UPPER_Y0, UPPER_Y1, upperZ - 0.3, upperZ, gap);
  box(upperX - 4, upperX - 2, UPPER_Y0 - 0.6, UPPER_Y0, FRIDGE_Z1 + 2, HOB_Z0 - 2, led, false);    // under-cabinet LEDs
  box(upperX - 4, upperX - 2, UPPER_Y0 - 0.6, UPPER_Y0, HOB_Z1 + 2, WALL_Z - 2, led, false);
  box(upperX, RUN_X1, UPPER_Y0 - 0.6, UPPER_Y0, upperZ + 2, upperZ + 4, led, false);

  // ---- angled black-glass hood with chimney ----
  const hz = (HOB_Z0 + HOB_Z1) / 2;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2, 48, HOB_Z1 - HOB_Z0 - 2), blackGlass);
  glass.position.set(WALL_X + 30, 172, hz);
  glass.rotation.z = 0.55;  // top leans back to the wall
  glass.castShadow = true;
  k.add(glass);
  box(WALL_X, WALL_X + 40, 150, 153, HOB_Z0 + 2, HOB_Z1 - 2, steel, false);
  box(WALL_X, WALL_X + 22, 190, 257, hz - 14, hz + 14, blackGlass, false);

  return k;
}

// Ceiling spots and a smoke detector; only shown in Walk view (from above they'd float).
export function buildCeilingDetails(wallH) {
  const g = new THREE.Group();
  const bulb = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff1d6', emissiveIntensity: 1 });
  const ring = new THREE.MeshStandardMaterial({ color: '#e8e6e1', roughness: 0.4, metalness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.5 });
  const recessed = [[300, 190], [300, 300], [60, -60], [60, 40], [130, 60], [380, 555], [75, 500], [140, 190], [455, 115]];
  for (const [x, z] of recessed) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.6, 20), ring);
    r.position.set(x, wallH - 0.3, z);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.7, 20), bulb);
    b.position.set(x, wallH - 0.4, z);
    g.add(r, b);
  }
  const surface = [[180, -330], [380, -330], [180, -150], [380, -170]];  // black surface spots in the living room
  for (const [x, z] of surface) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2, 20), black);
    base.position.set(x, wallH - 1, z);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 12, 20), black);
    can.position.set(x, wallH - 9, z);
    can.rotation.x = 0.35;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.4, 20), bulb);
    lens.position.set(x, wallH - 15, z + 2);
    lens.rotation.x = 0.35;
    g.add(base, can, lens);
  }
  const smoke = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 3, 24), new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.6 }));
  smoke.position.set(292, wallH - 1.5, 250);
  g.add(smoke);
  return g;
}
