import * as THREE from 'three';
import { type Builder, seeded, slice } from '../../../../world/build';
import { AVENUES, DISTRICTS, EDGE, FOREST, MARGIN, PARKS, PLAZA, RINGS, ROAD, lots, relief, seat, within } from '../../layout';
import { D2R, KIND, arc, flat, gap, polar, seen, stand, sweep, tag } from './kit';
import { BROKEN, floorish, inner, slopeAt, toGeometry } from './plates';
import { inForest } from './roads';
import { waters } from './water';

// The land that is whole: one surface from the top of the dome out to where the land breaks, and on the far side out
// to the torn edge. Under the city it is level and paved: streets, squares, yards. In the forest it rises in hills and
// small mountains (relief), and there it is laid closely enough that nothing another part stands on it floats or
// sinks. What is worked out per pixel is in the floor's material; what is drawn once is a map of the yards under the
// city's buildings, and of the water's beds and banks.

// The map: how far out from the middle it reaches, and how many pixels across it is.
export const MAP = { r: 700, px: 2048 } as const;
// The heights the forest's land is shaded by: its tallest mountain.
export const TALL = 120;
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

// The map: red the yards round the city's buildings, green the roads and tracks (half its strength their verges),
// blue the water (half its strength its banks); its alpha is unused.
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
  // The ways and the water. Each channel keeps the most of what is drawn on it, so a bank never reads as water.
  g.globalCompositeOperation = 'lighten';
  const line = (pts: THREE.Vector2[], w: number, style: string) => {
    g.strokeStyle = style;
    g.lineWidth = w * k;
    g.beginPath();
    pts.forEach((q, i) => (i ? g.lineTo(px(q.x), px(q.y)) : g.moveTo(px(q.x), px(q.y))));
    g.stroke();
  };
  const shape = (pts: THREE.Vector2[], style: string, edge: number) => {
    g.fillStyle = g.strokeStyle = style;
    g.lineWidth = edge * k;
    g.beginPath();
    pts.forEach((q, i) => (i ? g.lineTo(px(q.x), px(q.y)) : g.moveTo(px(q.x), px(q.y))));
    g.closePath();
    g.fill();
    if (edge > 0) g.stroke();
  };
  const w = waters();
  for (const run of w.runs) line(run.pts, run.w + 7, 'rgb(0,0,128)');
  shape(w.shore, 'rgb(0,0,128)', 8);
  for (const run of w.runs) line(run.pts, run.w, 'rgb(0,0,255)');
  shape(w.shore, 'rgb(0,0,255)', 0);
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
const reachAt = (deg: number) => (seen(deg, BROKEN) ? inner(deg) : EDGE.at(deg) - 0.7);
// The forest's window on the map, a little wider than the forest so its hills rise inside it.
const WINDOW = { from: FOREST.from - 6, to: FOREST.to + 6, r0: FOREST.r0 - 30 } as const;
const inWindow = (deg: number) => within(((deg % 360) + 360) % 360, WINDOW.from, WINDOW.to);

// The whole land. Where it is level it is laid in coarse rings; over the forest, in a fine grid that follows the
// land's hills and mountains at the size of a tree. The two meet where the land is level, so their seam is closed.
export async function floorGeometry(): Promise<THREE.BufferGeometry> {
  const f = floorish(), n = new THREE.Vector3();
  const put = (q: THREE.Vector2) => {
    const h = relief(q.x, q.y);
    f.pos.push(q.x, 0, q.y); f.plan.push(q.x, q.y, 0, 0); f.aux.push(h / TALL, 0, 0);
    slopeAt(q.x, q.y, n);
    f.nrm.push(n.x, n.y, n.z);
  };
  const quad = (a: THREE.Vector2, c: THREE.Vector2, d: THREE.Vector2, e: THREE.Vector2) => { for (const q of [a, d, c, a, e, d]) put(q); };
  const bands = [{ r0: 0, r1: 150, segs: 120, rows: 10 }, { r0: 150, r1: WINDOW.r0, segs: 240, rows: 8 }, { r0: WINDOW.r0, r1: null, segs: 240, rows: 14 }];
  for (const b of bands) {
    const at = (j: number, i: number) => { const deg = (j / b.segs) * 360, outer = b.r1 ?? reachAt(deg); return polar(deg, b.r0 + ((outer - b.r0) * i) / b.rows); };
    for (let j = 0; j < b.segs; j++) {
      const deg = (j / b.segs) * 360;
      if (b.r1 === null && inWindow(deg + 0.75)) continue;
      for (let i = 0; i < b.rows; i++) quad(at(j, i), at(j + 1, i), at(j + 1, i + 1), at(j, i + 1));
    }
    await slice();
  }
  // The forest: the window's bearings in steps that match the outer band's at its sides, and rows a few units apart.
  const from = WINDOW.from, span = WINDOW.to - WINDOW.from, cols = Math.round(span / 1.5) * 5, rows = 76;
  const at = (j: number, i: number) => { const deg = from + (span * j) / cols, outer = reachAt(deg); return polar(deg, WINDOW.r0 + ((outer - WINDOW.r0) * i) / rows); };
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < rows; i++) quad(at(j, i), at(j + 1, i), at(j + 1, i + 1), at(j, i + 1));
    await slice();
  }
  return toGeometry(f);
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
  // An arc's runs that keep out of the forest.
  const clear = (pts: THREE.Vector2[]) => {
    const runs: THREE.Vector2[][] = [[]];
    for (const q of pts) { if (inForest(q.x, q.y, 4)) { if (runs[runs.length - 1].length) runs.push([]); } else runs[runs.length - 1].push(q); }
    return runs.filter((x) => x.length > 1);
  };
  const inside = RINGS.filter((ring) => ring < MARGIN - 8);
  for (const ring of inside) for (const s of [-1, 1]) {
    const rr = ring + s * (ROAD / 2 + 0.3);
    for (const [a, z] of open(rr, -118, 118)) for (const run of clear(arc(rr, a, z, 7))) flat(b, low, tag(sweep(kerb(0.8, 0.7), run), KIND.stone));
  }
  for (const a of AVENUES) {
    if (!seen(a, 125) || a === 0) continue;
    for (const s of [-1, 1]) {
      let from = PLAZA + 1;
      for (const ring of [...inside, MARGIN]) {
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
      if (inForest(q.x, q.y, 6) || q.length() > inner(deg) - 3) continue;
      lamp(b, low, seat(q.x, q.y), 4 + r() * 1.4);
    }
  };
  for (const ring of inside) for (const a of AVENUES) if (seen(a, 125) && a !== 0) corner(a, ring);
  for (const ring of inside) for (let k = 0; k < 9; k++) {
    const deg = (r() - 0.5) * 230, q = polar(deg, ring + (r() < 0.5 ? -1 : 1) * (ROAD / 2 + 1.6));
    if (AVENUES.some((a) => gap(deg, a) * D2R * ring < ROAD * 1.5) || gap(deg, 0) < 12 || inForest(q.x, q.y, 6) || q.length() > inner(deg) - 3) continue;
    lamp(b, low, seat(q.x, q.y), 4.4);
  }
  await slice();
  // The plaza: a ring of low lamps let into its edge.
  for (let i = 0; i < 24; i++) { const q = polar(i * 15 + 7.5, PLAZA - 3); stand(b, low, tag(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 6).translate(0, 0.4, 0), KIND.light, 0.7, 0.6), seat(q.x, q.y)); }

  // Where the temple quarter and the port meet the city: a low wall of dressed stone with a coping, open at the
  // avenues.
  for (const k of ['temple', 'port'] as const) {
    const d = DISTRICTS.find((x) => x.kind === k)!;
    for (const [a, z] of open(d.r0 - 1, d.from, d.to)) {
      flat(b, made, tag(sweep([[-0.9, -0.8], [0.9, -0.8], [0.75, 1.8], [-0.75, 1.8]], arc(d.r0 - 1, a, z, 4)), KIND.stone));
      flat(b, made, tag(sweep([[-1, 1.7], [1, 1.7], [0.9, 2.2], [-0.9, 2.2]], arc(d.r0 - 1, a, z, 4)), KIND.bronzeDeep));
    }
    for (const side of [d.from, d.to]) {
      const pts = [polar(side, d.r0), polar(side, (d.r0 + d.r1) / 2), polar(side, d.r1 - 2)];
      flat(b, made, tag(sweep([[-0.9, -0.8], [0.9, -0.8], [0.75, 1.8], [-0.75, 1.8]], pts), KIND.stone));
    }
  }
  await slice();

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
