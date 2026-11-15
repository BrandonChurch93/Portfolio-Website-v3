import * as THREE from 'three';
import { EDGE } from '../pieces/skycity/layout';
import { polished } from '../pieces/skycity/polish';
import { D2R, Pile, SPIRE_TALL, TAU, type Built, type Look, dim, type Ring, cap, lin, loft, ngon, off, polar, put, rect, ribbon, scaled, seeded, tube, wander, windowed } from './kit';

// C · A crystal world. The planet first: it grows crystal. Great shards of dark glass have thrust out of its black
// ground at angles, in one lopsided burst, with fields of small crystals round them, and the planet's light runs
// through the ground in veins that pool here and there. Then the city, laid on that planet: people live in the
// great shards, whose floors are lit from inside, with copper decks round them and bridges between them, and in a
// town of copper and bronze at their feet and along the veins. The tallest shard is the spire, and wears the rings.

const GLASS = 0, COPPER = 1, WALL = 2, LIGHT = 3, EMBER = 4, DEEP = 5, LAMP = 6;
// The great shards: where each stands on the map, how tall and how wide it is, how far it leans and toward which
// bearing. The first is the spire and stands straight.
const GREAT = [
  { x: 0, z: 0, h: SPIRE_TALL, w: 46, lean: 0, to: 0 },
  { x: -70, z: 34, h: 210, w: 42, lean: 19, to: 282 },
  { x: -168, z: 70, h: 172, w: 38, lean: 33, to: 274 },
  { x: -282, z: 44, h: 124, w: 32, lean: 47, to: 266 },
  { x: 84, z: -22, h: 184, w: 38, lean: 15, to: 84 },
  { x: 188, z: 50, h: 132, w: 32, lean: 38, to: 96 },
  { x: 40, z: 132, h: 96, w: 28, lean: 30, to: 14 },
  { x: -50, z: -130, h: 156, w: 36, lean: 22, to: 200 },
  { x: 330, z: 140, h: 86, w: 25, lean: 52, to: 108 },
  { x: -420, z: 170, h: 78, w: 24, lean: 56, to: 252 },
  { x: 300, z: -70, h: 116, w: 30, lean: 34, to: 70 },
  { x: -270, z: -90, h: 124, w: 31, lean: 30, to: 300 },
  { x: 470, z: 150, h: 66, w: 21, lean: 44, to: 80 },
  { x: -540, z: 60, h: 62, w: 21, lean: 46, to: 286 },
  { x: 180, z: 360, h: 50, w: 18, lean: 35, to: 150 },
  { x: -210, z: 390, h: 52, w: 18, lean: 38, to: 215 },
  { x: 60, z: 470, h: 40, w: 16, lean: 40, to: 30 },
  { x: -420, z: 380, h: 44, w: 17, lean: 42, to: 240 },
] as const;
// Which great shards a bridge joins, and how far up the lower of the two it springs from.
const BRIDGES = [[0, 1, 0.5], [0, 4, 0.52], [1, 2, 0.46], [4, 5, 0.44], [0, 7, 0.5], [0, 6, 0.5]] as const;
const VEINS = [18, 71, 122, 171, 228, 281, 333];

// How wide a shard is at a height, as a share of its foot.
const girth = (k: number): number => (k < 0.1 ? 0.92 + 0.8 * k : k < 0.78 ? 1 - 0.2 * ((k - 0.1) / 0.68) : 0.8 * (1 - ((k - 0.78) / 0.22) ** 1.4));

function crystal(w: number, h: number, rnd: () => number): THREE.BufferGeometry {
  const sides = 5 + Math.floor(rnd() * 2), turn = rnd() * TAU, base: Ring = ngon(sides, w / 2, turn).map(([x, z]) => { const k = 0.82 + 0.3 * rnd(); return [x * k, z * k] as [number, number]; });
  const ox = (rnd() - 0.5) * 0.4 * w, oz = (rnd() - 0.5) * 0.4 * w;
  return loft([0, 0.1, 0.78, 0.9, 1].map((k) => ({ y: k * h, p: scaled(base, Math.max(0.03, girth(k)), ox * Math.max(0, (k - 0.78) / 0.22), oz * Math.max(0, (k - 0.78) / 0.22)) })), { top: false });
}

function block(pile: Pile, to: THREE.Matrix4, w: number, d: number, h: number): void {
  pile.add(loft([{ y: 0, p: rect(w, d) }, { y: h, p: rect(w * 0.94, d * 0.94) }], { top: false }), WALL, to);
  if (h > 16) {
    // A taller house steps back and carries a second storey and a lantern.
    pile.add(loft([{ y: h, p: rect(w + 1, d + 1) }, { y: h + 0.9, p: rect(w + 1, d + 1) }]), COPPER, to);
    pile.add(loft([{ y: h + 0.9, p: rect(w * 0.6, d * 0.6) }, { y: h * 1.36, p: rect(w * 0.54, d * 0.54) }], { top: false }), WALL, to);
    pile.add(loft([{ y: h * 1.36, p: rect(w * 0.68, d * 0.68) }, { y: h * 1.36 + 0.03 * h + 3, p: rect(0.4, 0.4) }]), COPPER, to);
  } else pile.add(loft([{ y: h, p: rect(w + 1.2, d + 1.2) }, { y: h + 0.42 * Math.min(w, d), p: rect(w * 0.5, 0.5) }]), COPPER, to);
  pile.add(new THREE.BoxGeometry(1.2, 2, 0.3).translate(0, 1, d / 2 + 0.16), EMBER, to);
}

export function build(c: Built): Look {
  const group = new THREE.Group(), pile = new Pile(), rnd = seeded(8831);
  group.name = 'shards';
  const glass = windowed(dim(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.03, 0.014, 0.005), metalness: 0, roughness: 0.06, ior: 1.75 }), c, 0.75), { cell: [3.4, 4.4], share: 0.62, power: 1.8, from: 60, top: 0.8, glow: 0.62, rim: 0.6 });
  const copper = polished(new THREE.MeshStandardMaterial({ color: lin('copper'), metalness: 1, roughness: 0.24 }));
  const wall = windowed(polished(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.04, 0.032, 0.027), metalness: 1, roughness: 0.32 })), { cell: [2.4, 3.1], share: 0.45, power: 1.6, top: 0.97 });
  const light = new THREE.MeshBasicMaterial({ color: lin('hot', 2.2) }), ember = new THREE.MeshBasicMaterial({ color: lin('flame', 1.0) }), deep = new THREE.MeshBasicMaterial({ color: lin('flame', 0.42) }), lamp = new THREE.MeshBasicMaterial({ color: lin('hot', 1.25) });
  const mats = [glass, copper, wall, light, ember, deep, lamp];

  // The planet's ground: black glass rock, smooth enough to show the sky and the shards' light in it.
  const rock = dim(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.011, 0.009, 0.008), metalness: 0, roughness: 0.26, ior: 2.1 }), c, 0.07);
  const land = cap({ rings: 96 }), ground = new THREE.Mesh(land, rock);
  ground.receiveShadow = true;
  ground.matrixAutoUpdate = false;
  group.add(ground);

  // The veins of light, each with a branch or two, and the pools on them.
  const veins = VEINS.map((deg, i) => wander(deg, 30, null, { sway: 9, phase: i * 1.7, wave: 190 + 30 * (i % 3), drift: (i % 2 ? 1 : -1) * 6 }));
  const paths = [...veins];
  veins.forEach((v, i) => {
    for (const at of [0.3, 0.58]) {
      const k = Math.floor(v.length * at), [x, z] = v[k], [deg, r] = polar(x, z), side = (i + (at > 0.4 ? 1 : 0)) % 2 ? 1 : -1;
      paths.push(wander(deg + side * 4, r, Math.min(r + 110 + 60 * rnd(), EDGE.at(deg + side * 20) - 10), { sway: 5, phase: rnd() * 6, wave: 150, drift: side * 70 }));
    }
  });
  paths.forEach((p, i) => {
    const main = i < veins.length;
    pile.add(ribbon(p, main ? 3.6 : 2, 0.4, main ? 1.4 : 0.6), EMBER).add(ribbon(p, main ? 1.3 : 0.7, 0.45, 0.4), LIGHT);
  });
  const pools: [number, number, number][] = [];
  veins.forEach((v, i) => {
    if (i % 2) return;
    const [x, z] = v[Math.floor(v.length * (0.34 + 0.2 * rnd()))], r = 9 + 6 * rnd();
    pools.push([x, z, r]);
    pile.add(new THREE.CircleGeometry(r, 36).rotateX(-Math.PI / 2), DEEP, put(x, z, { up: 0.5 })).add(new THREE.RingGeometry(r - 1.6, r, 40).rotateX(-Math.PI / 2), LIGHT, put(x, z, { up: 0.55 }));
    pile.add(new THREE.TorusGeometry(r + 0.7, 0.7, 6, 40).rotateX(Math.PI / 2), COPPER, put(x, z, { up: 0.6 }));
  });
  const vein = (x: number, z: number) => Math.min(...paths.map((p) => off(p, x, z)));

  // The great shards, the small ones round each foot, and what people have built on them.
  const stands = GREAT.map((g) => put(g.x, g.z, { face: g.to, lean: g.lean }));
  const feet = (x: number, z: number) => Math.min(...GREAT.map((g) => Math.hypot(x - g.x, z - g.z) - g.w * 0.62));
  GREAT.forEach((g, i) => {
    const to = stands[i];
    pile.add(crystal(g.w, g.h, rnd), GLASS, to);
    const n = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const a = rnd() * TAU, d = g.w * (0.5 + 0.45 * rnd()), h = g.h * (0.2 + 0.3 * rnd());
      pile.add(crystal(g.w * (0.36 + 0.24 * rnd()), h, rnd), GLASS, put(g.x + Math.sin(a) * d, g.z + Math.cos(a) * d, { face: g.to + (rnd() - 0.5) * 90, lean: g.lean + 8 + 22 * rnd() }));
    }
    if (g.h < 90) return;
    // Decks: copper collars round the shard, lit underneath.
    for (const k of i === 0 ? [0.3, 0.46, 0.62, 0.76] : [0.3, 0.5, 0.68]) {
      const r = (g.w / 2) * girth(k) + (i === 0 ? 5 : 3.4);
      pile.add(tube(r, r, 1.3, 6, k * g.h), COPPER, to).add(tube(r - 1.2, r - 1.2, 0.5, 6, k * g.h - 0.5), LIGHT, to);
    }
  });
  // The spire's rings: three hoops of copper held off the shard, each with its lights.
  for (const [r, k] of [[46, 0.46], [35, 0.62], [25, 0.76]] as const) {
    const y = k * SPIRE_TALL + 0.6;
    pile.add(new THREE.TorusGeometry(r, 1.3, 8, 96).rotateX(Math.PI / 2).translate(0, y, 0), COPPER);
    for (let f = 0; f < 6; f++) pile.add(new THREE.BoxGeometry(r, 0.5, 0.7).translate(r / 2, y, 0).rotateY((f * Math.PI) / 3), COPPER);
    for (let f = 0; f < 24; f++) pile.add(new THREE.BoxGeometry(0.9, 0.9, 0.9).translate(r + 1.6, y, 0).rotateY((f / 24) * TAU), LAMP);
  }
  // Bridges between the great shards.
  const a = new THREE.Vector3(), b = new THREE.Vector3(), x1 = new THREE.Vector3(1, 0, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4();
  for (const [i, j, k] of BRIDGES) {
    const y = k * Math.min(GREAT[i].h, GREAT[j].h);
    a.set(0, y, 0).applyMatrix4(stands[i]);
    b.set(0, y, 0).applyMatrix4(stands[j]);
    const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
    q.setFromUnitVectors(x1, b.clone().sub(a).normalize());
    m.compose(mid, q, new THREE.Vector3(1, 1, 1));
    pile.add(new THREE.BoxGeometry(len, 1, 2.4), COPPER, m);
    for (let t = 6; t < len - 6; t += 8) pile.add(new THREE.BoxGeometry(0.8, 0.8, 0.8).translate(t - len / 2, 0.9, 1.1), LAMP, m);
  }

  // The town: at the feet of the great shards, tallest close in, and along the veins.
  const taken = new Set<string>();
  const claim = (x: number, z: number, cell = 11): boolean => {
    const key = `${Math.round(x / cell)},${Math.round(z / cell)}`;
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  };
  const ok = (x: number, z: number): boolean => { const [deg, r] = polar(x, z); return r < EDGE.at(deg) - 22 && feet(x, z) > 5 && vein(x, z) > 4.5 && !pools.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr + 4); };
  GREAT.slice(0, 14).forEach((g) => {
    const n = Math.round(g.h * 0.42);
    for (let k = 0; k < n; k++) {
      const ang = rnd() * TAU, d = g.w * 0.7 + 7 + rnd() ** 1.5 * 62, x = g.x + Math.sin(ang) * d, z = g.z + Math.cos(ang) * d;
      if (!ok(x, z) || !claim(x, z)) continue;
      const near = Math.exp(-d / 34);
      block(pile, put(x, z, { face: ang / D2R + 180 }), 8 + 3 * rnd(), 7 + 3 * rnd(), 6 + 26 * near * (0.6 + 0.6 * rnd()) + 3 * rnd());
    }
  });
  veins.forEach((v) => {
    for (let i = 3; i < v.length - 2; i += 2) {
      const p = v[i], n = v[i + 1], o = v[i - 1], dx = n[0] - o[0], dz = n[1] - o[1], l = Math.hypot(dx, dz) || 1, r = Math.hypot(p[0], p[1]);
      for (const s of [-1, 1]) {
        const lx = p[0] + (-dz / l) * s * 5.4, lz = p[1] + (dx / l) * s * 5.4;
        if (r < 470 && i % 4 === 3 && feet(lx, lz) > 4) pile.add(tube(0.22, 0.22, 2.8, 5), COPPER, put(lx, lz)).add(new THREE.BoxGeometry(0.8, 0.8, 0.8).translate(0, 3.1, 0), LAMP, put(lx, lz));
        if (r > 420 || rnd() < 0.3) continue;
        const d = 12 + rnd() * 5, x = p[0] + (-dz / l) * s * d, z = p[1] + (dx / l) * s * d;
        if (!ok(x, z) || !claim(x, z)) continue;
        block(pile, put(x, z, { face: Math.atan2((dz / l) * s, (-dx / l) * s) / D2R }), 8 + 2 * rnd(), 7, 5 + 9 * Math.exp(-r / 160) + 3 * rnd());
      }
    }
  });

  // The wild: fields of small crystals, in patches and singly, out to the tear.
  const sprout = (x: number, z: number, big: number) => {
    if (!ok(x, z) || !claim(x, z, 6)) return;
    pile.add(crystal(2.4 + 3.4 * rnd() * big, (5 + 17 * rnd() ** 1.6) * big, rnd), GLASS, put(x, z, { face: rnd() * 360, lean: 26 * rnd() }));
  };
  for (let patch = 0; patch < 26; patch++) {
    const deg = rnd() * 360, r = 190 + rnd() * 400, cx = Math.sin(deg * D2R) * r, cz = Math.cos(deg * D2R) * r, big = 0.8 + 0.9 * rnd();
    for (let i = 0; i < 46; i++) { const ang = rnd() * TAU, d = Math.sqrt(rnd()) * (26 + 22 * big); sprout(cx + Math.sin(ang) * d, cz + Math.cos(ang) * d, big); }
  }
  for (let i = 0; i < 420; i++) { const deg = rnd() * 360, r = 120 + rnd() * 540; sprout(Math.sin(deg * D2R) * r, Math.cos(deg * D2R) * r, 0.7 + 0.5 * rnd()); }

  const mesh = pile.mesh(mats);
  group.add(mesh);
  return {
    group,
    dispose() { land.dispose(); mesh.geometry.dispose(); rock.dispose(); for (const mat of mats) mat.dispose(); },
  };
}
