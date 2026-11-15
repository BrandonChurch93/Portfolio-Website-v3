import * as THREE from 'three';
import { type Builder, seeded, slice } from '../../../../world/build';
import { AVENUES, CITY, DISTRICTS, PARKS, PLAZA, RINGS, ROAD, districtAt, lots, seat } from '../../layout';
import { OLD, TALL, bareness, groundAt } from './bare';
export { TALL };
import { D2R, KIND, arc, edgeAt, flat, gap, onDome, polar, seen, stand, sweep, tag } from './kit';
import { BROKEN, inner } from './plates';

// The land that is whole: one surface from the top of the dome out to where the land breaks, and on the far side out
// to the torn edge. Under the city it is level and paved: streets, squares, yards. Outside it, where it is bare, it is
// the planet's own ground (./bare.ts). What is worked out per pixel is in the floor's material; what is drawn once is
// a map of the yards under the city's buildings and of the old roads.

// The map: how far out from the middle it reaches, and how many pixels across it is.
export const MAP = { r: 700, px: 1024 } as const;
const EDGES = [PLAZA, ...RINGS];

interface Square { r0: number; r1: number; from: number; to: number; pool: { a: number; r: number; ra: number; rr: number }; paths: THREE.Vector2[][]; house: 'pavilion' | 'glass'; at: THREE.Vector2 }
const span = (p: { from: number; to: number }) => ((p.to - p.from + 720) % 360);

export function squares(): Square[] {
  const r = seeded(808);
  return PARKS.map((p, i) => {
    const r0 = EDGES[p.band] + ROAD / 2 + 1.5, r1 = EDGES[p.band + 1] - ROAD / 2 - 1.5, s = span(p), mid = p.from + s / 2, rm = (r0 + r1) / 2;
    const deep = r1 - r0, wide = s * D2R * rm;
    const pool = { a: mid + (r() - 0.5) * s * 0.15, r: rm - deep * 0.12, ra: Math.min(wide * 0.22, 36), rr: deep * 0.16 };
    const paths: THREE.Vector2[][] = [];
    for (const rr of [r0 + 3, r1 - 3]) paths.push(Array.from({ length: 30 }, (_, k) => polar(p.from + (s * k) / 29, rr)));
    paths.push(Array.from({ length: 48 }, (_, k) => {
      const t = (k / 47) * Math.PI * 2, a = pool.a + ((Math.sin(t) * (pool.ra + 6)) / pool.r) / D2R;
      return polar(a, pool.r + Math.cos(t) * (pool.rr + 5));
    }));
    return { r0, r1, from: p.from, to: p.to, pool, paths, house: i === 0 ? 'pavilion' : 'glass', at: polar(mid, r1 - 26) };
  });
}

// The map: red the yards round the city's buildings, green the old roads; blue and alpha are unused.
export async function floorMap(sq: Square[]): Promise<THREE.CanvasTexture> {
  const c = document.createElement('canvas');
  c.width = c.height = MAP.px;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, MAP.px, MAP.px);
  const k = MAP.px / (2 * MAP.r), px = (v: number) => (v + MAP.r) * k;
  g.globalCompositeOperation = 'lighten';
  let n = 0;
  for (const l of lots()) {
    g.save();
    g.translate(px(l.x), px(l.z));
    g.rotate(-l.turn * D2R);
    // The yard's border course at half strength, its slabs at full.
    for (const [grow, style] of [[11, 'rgb(128,0,0)'], [6, 'rgb(255,0,0)']] as const) {
      g.fillStyle = style;
      const w = (l.w + grow) * k, d = (l.d + grow) * k;
      g.beginPath();
      g.roundRect(-w / 2, -d / 2, w, d, 2 * k);
      g.fill();
    }
    g.restore();
    if (++n % 40 === 0) await slice();
  }
  g.lineCap = g.lineJoin = 'round';
  for (const p of sq) {
    g.strokeStyle = 'rgb(255,0,0)';
    g.lineWidth = 2.4 * k;
    for (const path of p.paths) {
      g.beginPath();
      path.forEach((q, i) => (i ? g.lineTo(px(q.x), px(q.y)) : g.moveTo(px(q.x), px(q.y))));
      g.stroke();
    }
    g.fillStyle = 'rgb(0,0,255)';
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2, a = p.pool.a + ((Math.sin(t) * p.pool.ra) / p.pool.r) / D2R, q = polar(a, p.pool.r + Math.cos(t) * p.pool.rr);
      if (i) g.lineTo(px(q.x), px(q.y)); else g.moveTo(px(q.x), px(q.y));
    }
    g.fill();
  }
  await slice();
  // The old roads that run on out of the city into the bare ground, to nowhere.
  g.strokeStyle = 'rgb(0,255,0)';
  g.lineWidth = ROAD * k;
  for (const o of OLD) {
    const a0 = polar(o.deg, CITY.r - 8), a1 = polar(o.deg, o.to);
    g.beginPath(); g.moveTo(px(a0.x), px(a0.y)); g.lineTo(px(a1.x), px(a1.y)); g.stroke();
  }
  await slice();
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// Where the whole land ends at a bearing: where it breaks, or on the far side the torn edge.
const reachAt = (deg: number) => (seen(deg, BROKEN) ? inner(deg) : edgeAt(deg) - 0.7);
const OPEN = DISTRICTS.filter((d) => d.kind === 'open');
// The land is laid in coarse grids where it is level and hidden (the city, the jungle, the dunes) and finely where it
// is bare and seen: the rim at the front, from a little inside the city's edge, and the two open wedges. The fine
// grids share a step across, so where they meet they meet point on point: a bearing every RIM.step degrees, from a
// whole number of steps before the first wedge.
const RIM = { r0: CITY.r - 12, step: (OPEN[0].to - OPEN[0].from) / 64, rows: 3 } as const;
const FRONT = { from: OPEN[1].from - 13 * RIM.step, to: 360 + OPEN[0].to + 8 } as const;
// The far side behind the city, which is never seen: the outer grid leaves it out.
const HIDDEN = [112, 216] as const;

// The whole land, as grids laid round the middle. Each point is worked out once: where it is on the map, how high the
// ground stands there, and from that where it is in the frame. Its normals come from the grid itself. plan holds the
// map's place and how bare the ground is; aux how high it stands.
export async function floorGeometry(): Promise<THREE.BufferGeometry> {
  const pos: number[] = [], plan: number[] = [], aux: number[] = [], idx: number[] = [];
  const grid = async (from: number, to: number, cols: number, r0: number, outer: (deg: number) => number, rows: number) => {
    const base = pos.length / 3;
    for (let j = 0; j <= cols; j++) {
      const deg = from + ((to - from) * j) / cols, r1 = outer(deg), s = Math.sin(deg * D2R), c = Math.cos(deg * D2R);
      for (let i = 0; i <= rows; i++) {
        const r = Math.max(0.05, r0 + ((r1 - r0) * i) / rows), x = s * r, z = c * r, m = bareness(x, z), h = groundAt(x, z, m), v = pos.length / 3;
        pos.push(0, 0, 0);
        onDome(x, h, z, pos, v * 3);
        plan.push(x, z, m, 0);
        aux.push(h / TALL, 0, 0);
      }
      if (j % 16 === 0) await slice();
    }
    for (let j = 0; j < cols; j++) for (let i = 0; i < rows; i++) {
      const a = base + j * (rows + 1) + i, b = a + rows + 1;
      idx.push(a, a + 1, b + 1, a, b + 1, b);
    }
  };
  const mid = () => RIM.r0;
  await grid(0, 360, 120, 0, () => 150, 10);
  // The city, round the two wedges.
  await grid(OPEN[0].to, OPEN[1].from, Math.round((OPEN[1].from - OPEN[0].to) / 1.5), 150, mid, 40);
  await grid(OPEN[1].to, 360 + OPEN[0].from, Math.round((360 + OPEN[0].from - OPEN[1].to) / 1.5), 150, mid, 40);
  // The wedges, finely, their rows three to each of the city's.
  for (const w of OPEN) await grid(w.from, w.to, 64, 150, mid, 40 * RIM.rows);
  // The rim: finely across the front, coarsely at the limbs, where the jungle and the dunes stand on it.
  const rows = (deg: number) => reachAt(deg);
  await grid(FRONT.from, FRONT.to, Math.round((FRONT.to - FRONT.from) / RIM.step), RIM.r0, rows, 36);
  await grid(FRONT.to - 360, HIDDEN[0], Math.round((HIDDEN[0] - FRONT.to + 360) / 1.5), RIM.r0, rows, 14);
  await grid(HIDDEN[1], FRONT.from, Math.round((FRONT.from - HIDDEN[1]) / 1.5), RIM.r0, rows, 14);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('plan', new THREE.Float32BufferAttribute(plan, 4));
  g.setAttribute('aux', new THREE.Float32BufferAttribute(aux, 3));
  g.setIndex(idx);
  await slice();
  g.computeVertexNormals();
  // A point whose triangles have no area has no normal, and one NaN in a shader blacks out the whole canvas.
  const n = g.getAttribute('normal');
  for (let i = 0; i < n.count; i++) if (!(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) > 0.5)) n.setXYZ(i, 0, 1, 0);
  g.computeBoundingSphere();
  return g;
}

// A section, across it and up.
type Section = [number, number][];
const kerb = (w: number, h: number): Section => [[-w / 2, -0.6], [w / 2, -0.6], [w / 2 - 0.08, h], [-w / 2 + 0.08, h]];

// Splits a stretch of bearings where the avenues cross it at a radius, so a kerb leaves them open.
function open(r: number, from: number, to: number, clear = ROAD / 2 + 1): [number, number][] {
  const len = ((to - from) % 360 + 360) % 360, cuts = AVENUES.map((a) => ((a - from) % 360 + 360) % 360).filter((a) => a > 0 && a < len).sort((a, b) => a - b);
  const half = clear / r / D2R, out: [number, number][] = [];
  let at = 0;
  for (const c of cuts) { if (c - half > at + 0.2) out.push([from + at, from + c - half]); at = c + half; }
  if (len > at + 0.2) out.push([from + at, from + len]);
  return out;
}

const lampHead = new THREE.OctahedronGeometry(0.75);
// A street lamp on a post: a slender steel post, a bronze cap, and its light.
export function lamp(b: Builder, low: THREE.Material, at: THREE.Matrix4, tall = 4.6): void {
  stand(b, low, tag(new THREE.CylinderGeometry(0.22, 0.34, tall, 6).translate(0, tall / 2, 0), KIND.steel), at);
  stand(b, low, tag(new THREE.CylinderGeometry(0.7, 0.4, 0.45, 8).translate(0, tall + 0.15, 0), KIND.bronze), at);
  stand(b, low, tag(lampHead.clone().scale(0.75, 0.55, 0.75).translate(0, tall + 0.55, 0), KIND.light, 0.62, 1.1), at);
}

export async function standing(b: Builder, made: THREE.Material, low: THREE.Material, sq: Square[]): Promise<void> {
  const r = seeded(4517);
  // Kerbs along both sides of every street of the city, open where the streets cross.
  // An arc's runs that keep to the city's own streets: out of the jungle, the dunes, the open wedges and the bare
  // ground.
  const paved = (q: THREE.Vector2) => { const d = districtAt(q.x, q.y); return q.length() < CITY.r - 6 && (!d || d.kind === 'procession'); };
  const clear = (pts: THREE.Vector2[]) => {
    const runs: THREE.Vector2[][] = [[]];
    for (const q of pts) { if (!paved(q)) { if (runs[runs.length - 1].length) runs.push([]); } else runs[runs.length - 1].push(q); }
    return runs.filter((x) => x.length > 1);
  };
  const inside = RINGS.filter((ring) => ring < CITY.r);
  for (const ring of inside) for (const s of [-1, 1]) {
    const rr = ring + s * (ROAD / 2 + 0.3);
    for (const [a, z] of open(rr, -118, 118)) for (const run of clear(arc(rr, a, z, 7))) flat(b, low, tag(sweep(kerb(0.8, 0.7), run), KIND.stone));
  }
  for (const a of AVENUES) {
    if (!seen(a, 125) || a === 0) continue;
    for (const s of [-1, 1]) {
      let from = PLAZA + 1;
      for (const ring of [...inside, CITY.r]) {
        const to = ring - ROAD / 2 - 1, off = polar(a + 90, s * (ROAD / 2 + 0.3));
        if (to - from > 4) for (const run of clear([polar(a, from).add(off), polar(a, (from + to) / 2).add(off), polar(a, to).add(off)])) flat(b, low, tag(sweep(kerb(0.8, 0.7), run), KIND.stone));
        from = ring + ROAD / 2 + 1;
      }
    }
  }
  await slice();
  // Lamps where streets cross, a few at each corner, and one now and then along a street: never in rows.
  const corner = (deg: number, rr: number) => {
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const sx = i % 2 ? 1 : -1, sz = i < 2 ? 1 : -1;
      const q = polar(deg, rr + sz * (ROAD / 2 + 1.6)).add(polar(deg + 90, sx * (ROAD / 2 + 1.6)));
      if (!paved(q)) continue;
      lamp(b, low, seat(q.x, q.y), 4 + r() * 1.4);
    }
  };
  for (const ring of inside) for (const a of AVENUES) if (seen(a, 125) && a !== 0) corner(a, ring);
  for (const ring of inside) for (let k = 0; k < 9; k++) {
    const deg = (r() - 0.5) * 230, q = polar(deg, ring + (r() < 0.5 ? -1 : 1) * (ROAD / 2 + 1.6));
    if (AVENUES.some((a) => gap(deg, a) * D2R * ring < ROAD * 1.5) || gap(deg, 0) < 12 || !paved(q)) continue;
    lamp(b, low, seat(q.x, q.y), 4.4);
  }
  await slice();
  // The plaza: a ring of low lamps let into its edge.
  for (let i = 0; i < 24; i++) { const q = polar(i * 15 + 7.5, PLAZA - 3); stand(b, low, tag(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 6).translate(0, 0.4, 0), KIND.light, 0.7, 0.6), seat(q.x, q.y)); }

  // The squares: a pool with a stone kerb, low lamps along the walks, and a pavilion or a glass house.
  for (const p of sq) {
    for (const path of p.paths) for (let i = 3; i < path.length; i += 7) {
      const q = path[i];
      stand(b, low, tag(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 6).translate(0, 0.6, 0), KIND.light, 0.7, 0.6), seat(q.x + 1.6, q.y));
    }
    const ring = Array.from({ length: 65 }, (_, i) => {
      const t = (i / 64) * Math.PI * 2, a = p.pool.a + ((Math.sin(t) * (p.pool.ra + 0.6)) / p.pool.r) / D2R;
      return polar(a, p.pool.r + Math.cos(t) * (p.pool.rr + 0.6));
    });
    flat(b, low, tag(sweep([[-0.7, -0.3], [0.7, -0.3], [0.6, 0.7], [-0.6, 0.7]], ring), KIND.stone));
    const h = seat(p.at.x, p.at.y);
    const put = (g: THREE.BufferGeometry, k: number, m: THREE.Matrix4, a = 0, c = 0) => stand(b, made, tag(g, k, a, c), h.clone().multiply(m));
    const up = (y: number) => new THREE.Matrix4().makeTranslation(0, y, 0);
    if (p.house === 'pavilion') {
      put(new THREE.CylinderGeometry(15, 16.5, 1.2, 40), KIND.stone, up(0.6));
      put(new THREE.CylinderGeometry(13, 13, 0.4, 40), KIND.light, up(1.4), 0.55, 0.35);
      for (let i = 0; i < 12; i++) { const q = polar(i * 30, 12); put(new THREE.CylinderGeometry(0.75, 0.9, 8, 10), KIND.stone, new THREE.Matrix4().makeTranslation(q.x, 5.2, q.y)); }
      put(new THREE.CylinderGeometry(13.8, 13.8, 1.8, 40), KIND.gold, up(10.1));
      put(new THREE.SphereGeometry(13.2, 40, 12, 0, Math.PI * 2, 0, Math.PI * 0.45).scale(1, 0.7, 1), KIND.copper, up(10.9));
      put(new THREE.CylinderGeometry(0.25, 0.7, 6, 8), KIND.gold, up(22));
    } else {
      const R = 17;
      put(new THREE.CylinderGeometry(R + 1.5, R + 2, 2.4, 48), KIND.stone, up(1.2));
      put(new THREE.SphereGeometry(R, 48, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1), KIND.glass, up(2.4), 0.06);
      for (let i = 0; i < 12; i++) put(new THREE.TorusGeometry(R + 0.25, 0.4, 4, 18, Math.PI).scale(1, 0.85, 1), KIND.bronze, up(2.4).multiply(new THREE.Matrix4().makeRotationY((i * Math.PI) / 12)));
      for (const yy of [0.35, 0.68]) put(new THREE.TorusGeometry(R * Math.cos(Math.asin(yy)) + 0.25, 0.35, 5, 48).rotateX(Math.PI / 2), KIND.bronze, up(2.4 + yy * R * 0.85));
      put(new THREE.SphereGeometry(2.2, 16, 8), KIND.gold, up(2.4 + R * 0.85 + 1.2));
    }
    await slice();
  }
}
