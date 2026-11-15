import * as THREE from 'three';
import { EDGE } from '../pieces/skycity/layout';
import { polished } from '../pieces/skycity/polish';
import { D2R, Pile, SPIRE_TALL, TAU, type Built, type Look, dim, arc, aside, cap, chamfered, groundHoop, lin, loft, ngon, off, polar, put, rect, ribbon, scaled, seeded, tube, wander, windowed } from './kit';

// A · A river world. The planet first: its ground is dark bronze, banded in rings like turned metal, and its water
// is the stream's own light. The light rises in a spring at the top of the world and runs out in five rivers to the
// torn edge, where it falls away. Then the city, laid on that planet as cities are: along the rivers. No river runs
// straight at the visitor, so the middle of the picture is a valley of fields, a lake and a village, with a quarter
// of the city down each side of it and the spring's gardens at its head. The city is tallest part way down each
// river and low round the spring, so it is never one mound with the spire at its top. Over the spring stands one
// grand spire with great gold rings round it. It is a goldsmith's world: bronze, copper, gold and light.

const DARK = 0, WALL = 1, GOLD = 2, COPPER = 3, BRONZE = 4, LIGHT = 5, EMBER = 6, LEAF = 7, MIRROR = 8, DEEP = 9;
const SPRING = { r: 46, isle: 27 };
// The rivers: the bearing each sets out on, how far it sways, and where in its sway it starts.
// tall is how tall that river's quarter of the city stands beside the others: the one at the visitor's left is the
// great one.
const RIVERS = [{ deg: -35, sway: 5, phase: 0.4, tall: 1.2 }, { deg: 39, sway: 6, phase: 2.1, tall: 0.86 }, { deg: 111, sway: 6, phase: 1.2, tall: 1 }, { deg: 183, sway: 6, phase: 3.3, tall: 1 }, { deg: 253, sway: 6.5, phase: 4.0, tall: 1 }];
const WIDE = [11, 6];
// The city on a river: from where to where, and where along it the quarter is tallest and how far that spreads.
const CITY = { from: 118, to: 445, peak: 250, spread: 105 };
// The great rings round the spire: how far across, how high, how thick, and how each is tipped, in degrees.
const HOOPS = [{ r: 236, y: 118, thick: 3, tip: [5, 6] }, { r: 158, y: 170, thick: 2.5, tip: [-8, 3] }, { r: 92, y: 216, thick: 2, tip: [4, -7] }] as const;

type Path = [number, number][];
const turned = (g: THREE.BufferGeometry, by: number): THREE.BufferGeometry => g.rotateY(by);

function needle(pile: Pile, to: THREE.Matrix4, w: number, h: number): void {
  const base = chamfered(w, w, w * 0.17), top = 0.6, neck = 0.86 * h, k = (y: number) => 1 + (top - 1) * ((y - 3) / (neck - 3));
  pile.add(loft([{ y: 0, p: scaled(base, 1.36) }, { y: 3, p: scaled(base, 1.36) }]), BRONZE, to);
  pile.add(loft([{ y: 3, p: base }, { y: neck, p: scaled(base, top) }], { top: false }), WALL, to);
  if (h > 70) pile.add(loft([{ y: 0.66 * h, p: scaled(base, k(0.66 * h) + 0.08) }, { y: 0.66 * h + 2.4, p: scaled(base, k(0.66 * h + 2.4) + 0.08) }]), GOLD, to);
  pile.add(loft([{ y: neck, p: scaled(base, top + 0.06) }, { y: neck + 1.6, p: scaled(base, top + 0.06) }, { y: h, p: scaled(base, 0.02) }]), GOLD, to);
}

function slab(pile: Pile, to: THREE.Matrix4, w: number, d: number, h: number): void {
  const base = chamfered(w, d, 1.2);
  pile.add(loft([{ y: 0, p: scaled(base, 1.12) }, { y: 2.4, p: scaled(base, 1.12) }]), BRONZE, to);
  pile.add(loft([{ y: 2.4, p: base }, { y: h, p: scaled(base, 0.9) }], { top: false }), WALL, to);
  pile.add(loft([{ y: h, p: scaled(base, 0.98) }, { y: h + 1.8, p: scaled(base, 0.98) }]), GOLD, to);
  pile.add(loft([{ y: h + 1.8, p: ngon(6, Math.min(w, d) * 0.22) }, { y: h + 6, p: ngon(6, Math.min(w, d) * 0.22) }], { top: false }), LIGHT, to);
  pile.add(loft([{ y: h + 6, p: ngon(6, Math.min(w, d) * 0.3) }, { y: h + 6.8, p: ngon(6, Math.min(w, d) * 0.3) }, { y: h + 11, p: ngon(6, 0.2) }]), GOLD, to);
}

function hall(pile: Pile, to: THREE.Matrix4, w: number, d: number, h: number): void {
  pile.add(loft([{ y: 0, p: rect(w, d) }, { y: h, p: rect(w, d) }], { top: false }), WALL, to);
  pile.add(loft([{ y: h, p: rect(w + 2.4, d + 6) }, { y: h + 0.9, p: rect(w + 2.4, d + 6) }, { y: h + 0.9 + d * 0.34, p: rect(w + 2.4, 0.7) }]), COPPER, to);
  pile.add(new THREE.BoxGeometry(w * 0.86, h * 0.62, 0.4).translate(0, h * 0.34, d / 2 + 0.25), EMBER, to);
  const n = Math.max(3, Math.round(w / 4.4));
  for (let i = 0; i < n; i++) pile.add(tube(0.55, 0.5, h, 6).translate(-w / 2 + 0.8 + (i * (w - 1.6)) / (n - 1), 0, d / 2 + 2.3), GOLD, to);
}

function drum(pile: Pile, to: THREE.Matrix4, r: number, h: number): void {
  const wall = 0.66 * h;
  pile.add(tube(r * 1.25, r * 1.25, 1.6, 28), GOLD, to);
  pile.add(loft([{ y: 1.6, p: ngon(16, r) }, { y: wall, p: ngon(16, r * 0.95) }], { top: false }), WALL, to);
  pile.add(loft([{ y: wall, p: ngon(16, r * 0.82) }, { y: wall + 0.07 * h, p: ngon(16, r * 0.82) }], { top: false }), LIGHT, to);
  pile.add(tube(r * 1.06, r * 1.06, 1.4, 28, wall + 0.07 * h), GOLD, to);
  const from = wall + 0.07 * h + 1.4;
  pile.add(new THREE.SphereGeometry(r, 24, 8, 0, TAU, 0, Math.PI / 2).scale(1, (h - from) / r, 1).translate(0, from, 0), COPPER, to);
  pile.add(new THREE.SphereGeometry(1, 10, 6).translate(0, h + 0.7, 0), GOLD, to);
}

function house(pile: Pile, to: THREE.Matrix4, w: number, d: number, h: number): void {
  pile.add(loft([{ y: 0, p: rect(w, d) }, { y: h, p: rect(w, d) }], { top: false }), WALL, to);
  pile.add(loft([{ y: h, p: rect(w + 1.2, d + 1.2) }, { y: h + 0.45 * Math.min(w, d), p: rect(w * 0.5, 0.5) }]), COPPER, to);
  pile.add(new THREE.BoxGeometry(1.3, 2.2, 0.3).translate(0, 1.1, d / 2 + 0.16), EMBER, to);
}

function tree(pile: Pile, to: THREE.Matrix4, s: number): void {
  pile.add(tube(0.55 * s, 0.4 * s, 6 * s, 5), BRONZE, to);
  pile.add(new THREE.IcosahedronGeometry(3.4 * s, 1).scale(1.1, 0.7, 1.1).translate(0, 8 * s, 0), LEAF, to);
  pile.add(new THREE.IcosahedronGeometry(2.4 * s, 1).scale(1, 0.75, 1).translate(1.9 * s, 9.9 * s, 0.9 * s), LEAF, to);
  pile.add(new THREE.IcosahedronGeometry(2 * s, 1).scale(1, 0.75, 1).translate(-1.6 * s, 10.3 * s, -1.1 * s), LEAF, to);
}

function spire(pile: Pile): void {
  const H = SPIRE_TALL, shaft = (y: number) => 20 + (5.5 - 20) * ((y - 6) / (232 - 6)) ** 0.8;
  pile.add(tube(SPRING.isle, SPRING.isle, 2.6, 48), BRONZE).add(tube(22, 22, 3.4, 48, 2.6), GOLD);
  pile.add(loft([6, 40, 80, 128, 180, 232].map((y) => ({ y, p: ngon(12, shaft(y)) })), { top: false }), WALL);
  for (let f = 0; f < 6; f++) pile.add(turned(loft([{ y: 6, p: rect(1.8, 13, 25) }, { y: 96, p: rect(1.4, 5, shaft(96) + 2.2) }, { y: 176, p: rect(1, 0.6, shaft(176) + 0.2) }]), (f * Math.PI) / 3), GOLD);
  for (const y of [72, 128, 180, 220]) {
    pile.add(tube(shaft(y) + 1.5, shaft(y + 3) + 1.5, 3, 24, y), GOLD);
    pile.add(tube(shaft(y) + 6.5, shaft(y) + 6.5, 1, 32, y + 3), BRONZE);
    pile.add(tube(shaft(y) + 5.6, shaft(y) + 5.6, 0.5, 32, y + 2.5), LIGHT);
  }
  pile.add(loft([{ y: 232, p: ngon(6, 5.4) }, { y: 247, p: ngon(6, 5.4) }], { top: false }), LIGHT);
  for (let f = 0; f < 6; f++) pile.add(new THREE.BoxGeometry(0.9, 15, 0.9).translate(0, 239.5, 5.7).rotateY((f * Math.PI) / 3), GOLD);
  pile.add(loft([{ y: 247, p: ngon(12, 7.4) }, { y: 249, p: ngon(12, 7.4) }, { y: 262, p: ngon(12, 1) }, { y: H - 2, p: ngon(12, 0.4) }]), GOLD);
  pile.add(new THREE.SphereGeometry(1.3, 10, 8).translate(0, H - 1.4, 0), LIGHT);
}

export function build(c: Built): Look {
  const group = new THREE.Group(), pile = new Pile(), rnd = seeded(4127);
  group.name = 'rings';
  const dark = polished(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.036, 0.03, 0.026), metalness: 1, roughness: 0.3 }));
  const wall = windowed(polished(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.036, 0.03, 0.026), metalness: 1, roughness: 0.3 })), { cell: [2.7, 3.5], share: 0.4, power: 1.7, top: 0.97 });
  const gold = polished(new THREE.MeshStandardMaterial({ color: lin('copper-light'), metalness: 1, roughness: 0.18 }));
  const copper = dim(polished(new THREE.MeshStandardMaterial({ color: lin('copper', 0.6), metalness: 1, roughness: 0.46 })), c, 0.6);
  const bronze = polished(new THREE.MeshStandardMaterial({ color: lin('bronze', 0.55), metalness: 1, roughness: 0.38 }));
  const leaf = new THREE.MeshStandardMaterial({ color: lin('bronze', 0.62), metalness: 0.55, roughness: 0.62, flatShading: true });
  const band = dim(polished(new THREE.MeshStandardMaterial({ color: lin('copper-light'), metalness: 1, roughness: 0.17 })), c, 0.3);
  const mirror = dim(polished(new THREE.MeshStandardMaterial({ color: lin('copper-light', 0.5), metalness: 1, roughness: 0.08 })), c, 0.5);
  const light = new THREE.MeshBasicMaterial({ color: lin('hot', 2.2) }), ember = new THREE.MeshBasicMaterial({ color: lin('flame', 1.0) }), lamp = new THREE.MeshBasicMaterial({ color: lin('hot', 1.25) }), deep = new THREE.MeshBasicMaterial({ color: lin('flame', 0.42) });
  const mats = [dark, wall, gold, copper, bronze, light, ember, leaf, mirror, deep];

  // The planet's ground: blackened bronze, turned in rings round the spring. The turning is in its finish: bands of a
  // finer and a coarser cut, and a highlight that lies across the rings and swings with the cursor's light.
  const plate = dim(polished(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.14, 0.078, 0.04), metalness: 1, roughness: 0.36, anisotropy: 0.8 })), c, 0.3);
  const plain = plate.onBeforeCompile;
  plate.onBeforeCompile = (sh, r) => {
    plain.call(plate, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aPolar;\nvarying vec2 vPolar;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPolar = aPolar;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vPolar;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
{
	float w = max( fwidth( vPolar.y ), 1e-4 );
	float seen = 1.0 - smoothstep( 1.2, 3.6, w );
	float f = vPolar.y / 5.5, cut = abs( fract( f ) - 0.5 );
	float groove = ( 1.0 - smoothstep( 0.0, 0.5 * w / 5.5 + 0.04, 0.5 - cut ) ) * seen;
	float band = step( 0.5, fract( f * 0.5 ) );
	roughnessFactor = mix( roughnessFactor, mix( 0.33, 0.4, band ), seen );
	diffuseColor.rgb *= 1.0 - 0.3 * groove;
}`);
  };
  plate.customProgramCacheKey = () => 'rings-plate|polished';
  const land = cap({ rings: 96 });
  land.setAttribute('aPolar', land.getAttribute('uv').clone());
  const ground = new THREE.Mesh(land, plate);
  ground.receiveShadow = true;
  ground.matrixAutoUpdate = false;
  group.add(ground);

  // The spring and the rivers.
  pile.add(ribbon(arc((SPRING.r + SPRING.isle) / 2, 0, 360), SPRING.r - SPRING.isle, 0.45), EMBER);
  pile.add(ribbon(arc(SPRING.isle + 3, 0, 360), 2.2, 0.5), LIGHT);
  pile.add(groundHoop(SPRING.r + 1.4, 1.3, 0.8), GOLD);
  const rivers: Path[] = RIVERS.map((v) => wander(v.deg, SPRING.r - 1, null, { sway: v.sway, phase: v.phase, wave: 260 }));
  const half = (path: Path, i: number) => (WIDE[0] + (WIDE[1] - WIDE[0]) * (i / (path.length - 1))) / 2;
  for (const path of rivers) {
    pile.add(ribbon(path, WIDE[0], 0.45, WIDE[1]), EMBER);
    pile.add(ribbon(path, WIDE[0] * 0.42, 0.5, WIDE[1] * 0.36), LIGHT);
    for (const s of [-1, 1]) pile.add(ribbon(aside(path, (i) => s * (half(path, i) + 1.1)), 1.5, 0.95), GOLD);
  }
  // A brook runs down the valley from the spring, through the lake, to the tear. It is not one of the rivers: no
  // city stands on it.
  const brook = wander(2, SPRING.r - 1, null, { sway: 7, phase: 5.2, wave: 210 });
  pile.add(ribbon(brook, 4.2, 0.45, 3), EMBER).add(ribbon(brook, 1.5, 0.5, 1), LIGHT);
  const clear = (x: number, z: number, but = -1) => Math.min(...rivers.map((p, j) => (j === but ? Infinity : off(p, x, z))));

  spire(pile);

  // The city: along both banks of every river, three rows deep near the spring and one far out.
  const taken = new Set<string>(), cell = 15;
  const claim = (x: number, z: number): boolean => {
    const k = `${Math.round(x / cell)},${Math.round(z / cell)}`;
    if (taken.has(k)) return false;
    taken.add(k);
    return true;
  };
  rivers.forEach((path, k) => {
    for (let i = 2; i < path.length - 1; i += 2) {
      const p = path[i], q = path[i + 1], o = path[i - 1], dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      const rr = Math.hypot(p[0], p[1]);
      if (rr < SPRING.r + 12 || rr > CITY.to) continue;
      // A bridge now and then, and lamps along both banks.
      if (i % 12 === 6 && rr < 400) {
        const span = 2 * half(path, i) + 9, way = Math.atan2(dx, dz) / D2R;
        pile.add(new THREE.BoxGeometry(span, 0.8, 4), BRONZE, put(p[0], p[1], { face: way, up: 2.4 }));
        for (const s of [-1, 1]) pile.add(new THREE.BoxGeometry(span, 0.5, 0.5).translate(0, 0.9, s * 1.9), GOLD, put(p[0], p[1], { face: way, up: 2.4 }));
      }
      // How much of a city stands here: nothing at the spring, most at the middle of the quarter.
      const here = Math.exp(-(((rr - CITY.peak) / CITY.spread) ** 2)), tall = RIVERS[k].tall;
      for (const s of [-1, 1]) {
        const lx = p[0] + nx * s * (half(path, i) + 3.6), lz = p[1] + nz * s * (half(path, i) + 3.6);
        pile.add(tube(0.25, 0.25, 3.2, 5), BRONZE, put(lx, lz)).add(new THREE.BoxGeometry(0.9, 0.9, 0.9).translate(0, 3.6, 0), LIGHT, put(lx, lz));
        const rows = here > 0.72 ? 3 : here > 0.3 ? 2 : 1, face = Math.atan2(-nx * s, -nz * s) / D2R;
        for (let row = 0; row < rows; row++) {
          const d = half(path, i) + 13 + row * 20 + rnd() * 3, x = p[0] + nx * s * d, z = p[1] + nz * s * d, [deg, r] = polar(x, z);
          if (r < SPRING.r + 14 || r > Math.min(CITY.to, EDGE.at(deg) - 40) || clear(x, z, k) < 16 || !claim(x, z)) continue;
          const to = put(x, z, { face }), pick = rnd(), up = (0.75 + 0.5 * rnd()) * tall * 1.2;
          if (rr < CITY.from) {
            // The spring's gardens: low halls and trees.
            if (row === 0 && (i / 2) % 2 === 0) hall(pile, to, 13, 9, 8 + 3 * rnd());
            else tree(pile, to, 0.9 + 0.5 * rnd());
          } else if (row === 0) {
            if ((i / 2) % 3 === 0) needle(pile, to, 12 + 4 * rnd(), (26 + 66 * here) * up);
            else hall(pile, to, 13, 9, 8 + 8 * here + 4 * rnd());
          } else if (row === 1) {
            if (pick < 0.4) needle(pile, to, 12 + 5 * rnd(), (30 + 92 * here) * up);
            else if (pick < 0.66) slab(pile, to, 15 + 4 * rnd(), 10, (24 + 74 * here) * up);
            else if (pick < 0.82) drum(pile, to, 7.5, 18 + 20 * here);
            else house(pile, to, 9, 8, 6 + 3 * rnd());
          } else if (pick < 0.36) needle(pile, to, 11 + 4 * rnd(), (24 + 70 * here) * up);
          else if (pick < 0.56) slab(pile, to, 14, 9, (20 + 56 * here) * up);
          else if (pick < 0.82) house(pile, to, 8 + 2 * rnd(), 7, 5 + 3 * rnd());
          else tree(pile, to, 0.9 + 0.5 * rnd());
        }
      }
    }
  });
  // Round the spring: a ring of small markers, and trees.
  for (let i = 0; i < 20; i++) {
    const deg = (i / 20) * 360 + 9, [x, z] = [Math.sin(deg * D2R) * (SPRING.r + 15), Math.cos(deg * D2R) * (SPRING.r + 15)];
    if (clear(x, z) < 12) continue;
    if (i % 2) needle(pile, put(x, z), 6, 24);
    else tree(pile, put(x, z, { face: rnd() * 360 }), 1.1);
  }

  // Between the rivers: terraced fields that follow the planet's rings, some flooded and still, with a grove, a
  // village and a pond in each. And the land out to the tear, with a few trees on it.
  const spots: { x: number; z: number; r: number; kind: 'grove' | 'village' | 'pond' | 'lake' }[] = [];
  RIVERS.forEach((v, k) => {
    const next = RIVERS[(k + 1) % RIVERS.length].deg + (k === RIVERS.length - 1 ? 360 : 0), mid = (v.deg + next) / 2, span = next - v.deg;
    const add = (kind: 'grove' | 'village' | 'pond', a: number, r: number, size: number) => { const [x, z] = [Math.sin(a * D2R) * r, Math.cos(a * D2R) * r]; spots.push({ x, z, r: size, kind }); };
    if (k === 0) {
      // The valley the visitor looks up: a lake, a village on its shore, a grove at each side, a small one by the spring.
      { const i = brook.findIndex((p) => Math.hypot(p[0], p[1]) >= 262), [x, z] = brook[i]; spots.push({ x, z, r: 38, kind: 'lake' }); }
      add('village', mid - 15, 352, 36);
      add('grove', mid + 17, 372, 46);
      add('grove', mid - 9, 168, 30);
      add('grove', mid - 3, 470, 40);
      return;
    }
    add('grove', mid - 0.2 * span, 305 + 30 * rnd(), 52);
    add('village', mid + 0.2 * span, 255 + 30 * rnd(), 34);
    add('pond', mid - 0.04 * span, 205, 17);
    add('grove', mid + 0.12 * span, 425, 40);
  });
  const inSpot = (x: number, z: number, pad: number) => spots.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + pad);
  const FIELD = [COPPER, MIRROR, BRONZE, COPPER, MIRROR];
  for (let r = 150, band = 0; r < 640; r += 22, band++) {
    let run: Path = [];
    const flush = () => { if (run.length > 3) pile.add(ribbon(run, 12, 0.4), FIELD[band % FIELD.length]); run = []; };
    const plot = 9 + 14 * rnd(), start = rnd() * 30;
    for (let deg = 0; deg <= 360; deg += 1.5) {
      const x = Math.sin(deg * D2R) * r, z = Math.cos(deg * D2R) * r, gap = ((deg + start) % plot) < 1.6;
      if (!gap && clear(x, z) > (r > CITY.to + 20 ? 20 : 74) && off(brook, x, z) > 9 && r < EDGE.at(deg) - 16 && !inSpot(x, z, 5)) run.push([x, z]);
      else flush();
    }
    flush();
  }
  for (const s of spots) {
    const [deg] = polar(s.x, s.z);
    if (s.kind === 'pond' || s.kind === 'lake') {
      // A pond is still and mirrors the sky. The lake is the brook's own light, deep in the middle and bright at its shore.
      const shape = (r: number) => new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2).scale(s.kind === 'lake' ? 1.25 : 1, 1, s.kind === 'lake' ? 0.82 : 1);
      pile.add(shape(s.r - 2), s.kind === 'lake' ? DEEP : MIRROR, put(s.x, s.z, { up: 0.55 }));
      if (s.kind === 'lake') pile.add(new THREE.RingGeometry(s.r - 4.6, s.r - 2, 64).rotateX(-Math.PI / 2).scale(1.25, 1, 0.82), LIGHT, put(s.x, s.z, { up: 0.6 }));
      pile.add(new THREE.TorusGeometry(s.r - 1.4, 0.9, 6, 64).rotateX(Math.PI / 2).scale(s.kind === 'lake' ? 1.25 : 1, 1, s.kind === 'lake' ? 0.82 : 1), GOLD, put(s.x, s.z, { up: 0.7 }));
      const trees = s.kind === 'lake' ? 16 : 9;
      for (let i = 0; i < trees; i++) { const a = (i / trees) * TAU + rnd(), x = s.x + Math.sin(a) * (s.r + 7) * (s.kind === 'lake' ? 1.2 : 1), z = s.z + Math.cos(a) * (s.r + 7) * (s.kind === 'lake' ? 0.85 : 1); if (off(brook, x, z) > 7) tree(pile, put(x, z, { face: rnd() * 360 }), 0.8 + 0.5 * rnd()); }
      continue;
    }
    const n = s.kind === 'grove' ? Math.round(s.r * 1.1) : Math.round(s.r * 0.6);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * s.r, x = s.x + Math.sin(a) * d, z = s.z + Math.cos(a) * d, [b, r] = polar(x, z);
      if (r > EDGE.at(b) - 14 || clear(x, z) < 14 || off(brook, x, z) < 8 || !claim(x, z)) continue;
      if (s.kind === 'grove') tree(pile, put(x, z, { face: rnd() * 360 }), 1 + 0.9 * rnd());
      else if (i === 0) drum(pile, put(s.x, s.z), 6.5, 17);
      else house(pile, put(x, z, { face: deg + 90 * Math.round(rnd() * 3) }), 7 + 3 * rnd(), 6 + 2 * rnd(), 4.5 + 3 * rnd());
    }
  }
  // Out toward the tear: hamlets, and trees thinning to the edge.
  for (let v = 0; v < 9; v++) {
    const deg = rnd() * 360, r = 505 + rnd() * 60;
    for (let i = 0; i < 9; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 24, x = Math.sin(deg * D2R) * r + Math.sin(a) * d, z = Math.cos(deg * D2R) * r + Math.cos(a) * d, [b, rr] = polar(x, z);
      if (rr > EDGE.at(b) - 16 || clear(x, z) < 12 || off(brook, x, z) < 8 || inSpot(x, z, 0) || !claim(x, z)) continue;
      house(pile, put(x, z, { face: deg + 90 * Math.round(rnd() * 3) }), 7 + 3 * rnd(), 6 + 2 * rnd(), 4.5 + 3 * rnd());
    }
  }
  for (let i = 0; i < 520; i++) {
    const deg = rnd() * 360, r = 440 + rnd() * 215, [x, z] = [Math.sin(deg * D2R) * r, Math.cos(deg * D2R) * r];
    if (r > EDGE.at(deg) - 12 || clear(x, z) < 12 || off(brook, x, z) < 7 || inSpot(x, z, 0) || !claim(x, z)) continue;
    tree(pile, put(x, z, { face: rnd() * 360 }), 0.8 + 0.7 * rnd());
  }
  // Where each river reaches the tear, a pair of markers.
  rivers.forEach((path) => {
    const i = Math.max(2, path.length - 6), p = path[i], q = path[i + 1], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = -(q[1] - p[1]) / l, nz = (q[0] - p[0]) / l;
    for (const s of [-1, 1]) needle(pile, put(p[0] + nx * s * 15, p[1] + nz * s * 15), 8, 30);
  });

  const mesh = pile.mesh(mats);
  group.add(mesh);

  // The great rings, each with a row of lights that goes slowly round it.
  const dot = new THREE.BoxGeometry(1.1, 0.8, 0.8), spins: THREE.Object3D[] = [], hoops: THREE.BufferGeometry[] = [];
  for (const h of HOOPS) {
    const g = new THREE.Group(), geo = new THREE.TorusGeometry(h.r, h.thick, 12, 180).rotateX(Math.PI / 2), band0 = new THREE.Mesh(geo, band);
    hoops.push(geo);
    g.position.y = h.y;
    g.rotation.set(h.tip[0] * D2R, 0, h.tip[1] * D2R);
    band0.castShadow = true;
    const n = Math.round(h.r * 0.36), dots = new THREE.InstancedMesh(dot, lamp, n), m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; dots.setMatrixAt(i, m.makeRotationY(a).multiply(new THREE.Matrix4().makeTranslation(0, 0, h.r + h.thick + 0.2))); }
    g.add(band0, dots);
    spins.push(dots);
    group.add(g);
  }

  return {
    group,
    update(t) { spins.forEach((s, i) => { s.rotation.y = t * 0.02 * (i % 2 ? -1 : 1) * (1 + i * 0.4); }); },
    dispose() { land.dispose(); mesh.geometry.dispose(); dot.dispose(); for (const g of hoops) g.dispose(); plate.dispose(); band.dispose(); lamp.dispose(); deep.dispose(); for (const m of mats) m.dispose(); },
  };
}
