import * as THREE from 'three';
import { Builder, cyl, xf } from '../../../../world/build';
import {
  BEACON, BUTTRESS, CHANNEL, COLLAR, CUFF, DECK, DECKS, LANTERN, LINE, NEEDLE, NEEDLE_RINGS, NODE, PLINTH_TOP, RIB, RIBS, RUNS, SKY, STEPS, coreR, lanternR, ribR, ribTurn,
} from './form';
import type { Handle, LightName, SolidName } from './materials';

type Of = Record<SolidName | LightName, Handle>;
const D2R = Math.PI / 180;

// Two builders, one for the large forms that cast shadows and one for the fine parts that do not, and each piece's
// kind written on its vertices so one material can tell what it is made of.
class Parts {
  private cast = new Builder();
  private fine = new Builder();
  get tris() { return this.cast.tris + this.fine.tris; }
  add(geo: THREE.BufferGeometry, h: Handle, m?: THREE.Matrix4, shadow?: boolean): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cell[i * 4] = h.kind;
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    const casts = shadow ?? h.cast;
    (casts ? this.cast : this.fine).add(g, h.mat, m, { shadow: casts });
  }
  build(parent: THREE.Object3D): THREE.Mesh[] {
    return [...this.cast.build(parent, 'spire'), ...this.fine.build(parent, 'spire-fine')];
  }
}

// A turned profile of [radius, height], cut into runs at its sharp corners so each turned edge keeps a crisp line of
// light.
function turn(b: Parts, pts: [number, number][], h: Handle, seg: number, crease = 30): void {
  const runs: [number, number][][] = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    runs[runs.length - 1].push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), c = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let d = Math.abs(a - c) / D2R;
      if (d > 180) d = 360 - d;
      if (d > crease) runs.push([pts[i]]);
    }
  }
  for (const r of runs) if (r.length > 1) b.add(new THREE.LatheGeometry(r.map(([x, y]) => new THREE.Vector2(Math.max(x, 1e-4), y)), seg), h);
}

// A fin standing out from the axis at a bearing: at each height, how far in and out it reaches and how thick it is.
// Its section is a rectangle with its corners cut, so each long edge holds a line of light.
interface Station { y: number; rin: number; rout: number; th: number; turn?: number }
function fin(bearing: number, st: Station[]): THREE.BufferGeometry {
  const at = (u: number, v: number, q: Station): [number, number, number] => {
    const b = (bearing + (q.turn ?? 0)) * D2R, s = Math.sin(b), c = Math.cos(b);
    return [u * s + v * c, q.y, u * c - v * s];
  };
  const ring = (q: Station): [number, number][] => {
    const h = q.th / 2, k = Math.min(0.45, q.th * 0.2, (q.rout - q.rin) * 0.2);
    return [[q.rout, -h + k], [q.rout, h - k], [q.rout - k, h], [q.rin + k, h], [q.rin, h - k], [q.rin, -h + k], [q.rin + k, -h], [q.rout - k, -h]];
  };
  const pos: number[] = [], idx: number[] = [];
  const sides = 8;
  // Each side its own column of points, so the sides meet at hard edges.
  for (let e = 0; e < sides; e++) {
    const base = pos.length / 3;
    for (const q of st) {
      const r = ring(q), a = r[e], b = r[(e + 1) % sides];
      pos.push(...at(a[0], a[1], q), ...at(b[0], b[1], q));
    }
    for (let j = 0; j < st.length - 1; j++) { const p = base + j * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  }
  for (const [q, up] of [[st[0], -1], [st[st.length - 1], 1]] as [Station, number][]) {
    const base = pos.length / 3, r = ring(q);
    for (const [u, v] of r) pos.push(...at(u, v, q));
    for (let i = 1; i < sides - 1; i++) up > 0 ? idx.push(base, base + i + 1, base + i) : idx.push(base, base + i, base + i + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  // Smooth along the fin's length, hard across its sides: the normals of each side's faces are averaged up its column.
  return smoothAlong(flat);
}

// The same, with its long edges rounded and its faces shaded smoothly round them, so the light runs along each edge as
// one unbroken line that slides across it as the light moves. The sides and the two end caps.
function rounded(bearing: number, st: Station[], arc = 3): THREE.BufferGeometry[] {
  const at = (u: number, v: number, q: Station): [number, number, number] => {
    const b = (bearing + (q.turn ?? 0)) * D2R, s = Math.sin(b), c = Math.cos(b);
    return [u * s + v * c, q.y, u * c - v * s];
  };
  const ring = (q: Station): [number, number][] => {
    const h = q.th / 2, c = Math.min(h * 0.85, (q.rout - q.rin) * 0.45), out: [number, number][] = [];
    const corners: [number, number, number][] = [[q.rout - c, -h + c, -90], [q.rout - c, h - c, 0], [q.rin + c, h - c, 90], [q.rin + c, -h + c, 180]];
    for (const [cu, cv, a0] of corners) for (let i = 0; i < arc; i++) { const a = (a0 + (90 * i) / (arc - 1)) * D2R; out.push([cu + Math.cos(a) * c, cv + Math.sin(a) * c]); }
    return out;
  };
  const n = 4 * arc, pos: number[] = [], idx: number[] = [];
  for (const q of st) for (const [u, v] of ring(q)) pos.push(...at(u, v, q));
  for (let j = 0; j < st.length - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + ((i + 1) % n);
    idx.push(a, b, a + n, b, b + n, a + n);
  }
  const side = new THREE.BufferGeometry();
  side.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  side.setIndex(idx);
  side.computeVertexNormals();
  const cap: number[] = [], cidx: number[] = [];
  for (const [q, up] of [[st[0], -1], [st[st.length - 1], 1]] as [Station, number][]) {
    const base = cap.length / 3;
    for (const [u, v] of ring(q)) cap.push(...at(u, v, q));
    for (let i = 1; i < n - 1; i++) up > 0 ? cidx.push(base, base + i + 1, base + i) : cidx.push(base, base + i, base + i + 1);
  }
  const caps = new THREE.BufferGeometry();
  caps.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
  caps.setIndex(cidx);
  caps.computeVertexNormals();
  return [side, caps];
}

// Faces of a fin keep their own normals, averaged with the faces that share their side and height.
function smoothAlong(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const key = (i: number) => `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
  const sums = new Map<string, THREE.Vector3[]>();
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(n, i);
    const list = sums.get(key(i)) ?? [];
    let hit = list.find((s) => s.clone().normalize().dot(v) > 0.82);
    if (!hit) { hit = new THREE.Vector3(); list.push(hit); }
    hit.add(v);
    sums.set(key(i), list);
  }
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(n, i);
    const hit = sums.get(key(i))!.find((s) => s.clone().normalize().dot(v) > 0.82);
    if (hit) { const m = hit.clone().normalize(); n.setXYZ(i, m.x, m.y, m.z); }
  }
  return g;
}

// The heights a rib is cut at: fine where it curves out into its buttress and where it closes over the crown.
function ribStations(): Station[] {
  const st: Station[] = [], foot = PLINTH_TOP;
  const ys: number[] = [];
  for (let y = foot; y < RIB.from + 6; y += 3) ys.push(y);
  for (let y = RIB.from + 6; y < 300; y += 10) ys.push(y);
  for (let y = 300; y < RIB.to; y += 4.5) ys.push(y);
  ys.push(RIB.to + 0.5);
  const out0 = ribR(RIB.from) + RIB.depth / 2;
  for (const y of ys) {
    const k = Math.min(1, (y - foot) / (RIB.from - foot));
    const free = smooth(RIB.from - 22, RIB.from, y);
    const rib = ribR(y);
    const rout = y < RIB.from ? out0 + (BUTTRESS.r - out0) * (1 - k) ** BUTTRESS.curve : rib + RIB.depth / 2;
    const rin = (coreR(y) - 0.8) * (1 - free) + (rib - RIB.depth / 2) * free;
    const up = Math.min(1, Math.max(0, (y - RIB.from) / (RIB.to - RIB.from)));
    const th = y < RIB.from ? RIB.wide + (BUTTRESS.th - RIB.wide) * (1 - k) ** 1.6 : RIB.wide + (RIB.top - RIB.wide) * up ** 1.5;
    st.push({ y, rin: Math.max(0.3, Math.min(rin, rout - 0.6)), rout, th, turn: ribTurn(y) });
  }
  return st;
}
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// How far a deck's plate stands out from the axis.
export function deckOut(y: number): number {
  if (y === DECKS[0]) return DECK.canopy;
  if (y === DECKS[DECKS.length - 1]) return SKY.r + 1.4;
  return ribR(y) + RIB.depth / 2 + DECK.past;
}

export function buildSpire(of: Of): { group: THREE.Group; tris: number; meshes: THREE.Mesh[] } {
  const b = new Parts(), group = new THREE.Group();

  // The plinth: three steps of dark stone.
  const steps: [number, number][] = [];
  let y0 = 0;
  for (const [r, top] of STEPS) { steps.push([r, y0], [r, top]); y0 = top; }
  steps.push([16, PLINTH_TOP]);
  turn(b, [[0.01, 0], ...steps], of.stone, 112);

  // The lobby's drum of glass, and the core's runs.
  const [lobby, ...runs] = RUNS;
  b.add(cyl(lobby[2], lobby[1] - lobby[0], 96, lobby[3], true).translate(0, (lobby[0] + lobby[1]) / 2, 0), of.lobby);
  for (const [a, c, r0, r1] of runs) {
    b.add(cyl(r0, c - a, 72, r1, true).translate(0, (a + c) / 2, 0), of.core);
    // The channel the line of light runs in, up the front.
    for (const side of [-1, 1]) {
      const off = LINE.half * 1.9 + CHANNEL.wide / 2, at = (y: number, r: number): Station => ({ y, rin: r - 0.2, rout: r + CHANNEL.out, th: CHANNEL.wide, turn: (side * off) / r / D2R });
      b.add(fin(0, [at(a, r0), at(c, r1)]), of.dark);
    }
  }

  // The decks: a blackened plate, a copper fascia with a ring of light round it, and a clamp on each rib that passes.
  const blinks: THREE.Vector3[] = [];
  for (const y of DECKS) {
    const R = deckOut(y), t = DECK.thick, inner = Math.max(2, coreR(y) - 1.5), band = DECK.band;
    const seg = Math.round(Math.min(72, Math.max(40, R * 2.6)));
    turn(b, [[inner, y + t / 2], [R - 0.25, y + t / 2], [R, y + t / 2 - 0.25]], of.dark, seg);
    turn(b, [[R, y + t / 2 - 0.25], [R, y + band / 2]], of.copper, seg);
    b.add(cyl(R + 0.02, band, seg, R + 0.02, true).translate(0, y, 0), of.ring, undefined, false);
    turn(b, [[R, y - band / 2], [R, y - t / 2 + 0.25], [R - 0.25, y - t / 2], [inner, y - t / 2]], of.copper, seg);
    if (y === DECKS[0]) continue;
    for (const a0 of RIBS) {
      const a = (a0 + ribTurn(y)) * D2R, r = ribR(y);
      b.add(new THREE.BoxGeometry(RIB.wide + NODE.wide, t + NODE.tall, RIB.depth + NODE.deep), of.bronze, xf({ p: [Math.sin(a) * r, y, Math.cos(a) * r], r: [0, a, 0] }));
      blinks.push(new THREE.Vector3(Math.sin(a) * (R - 0.7), y + t / 2 + 0.35, Math.cos(a) * (R - 0.7)));
    }
  }

  // The ribs, each springing from a buttress on the plinth.
  const st = ribStations();
  for (const a of RIBS) for (const g of rounded(a, st)) b.add(g, of.steel);
  // The cuff on each rib where its buttress ends.
  const cuff: Station[] = [CUFF.y - CUFF.h, CUFF.y].map((y) => {
    const q = st.reduce((best, x) => (Math.abs(x.y - y) < Math.abs(best.y - y) ? x : best));
    return { y, rin: q.rin, rout: q.rout + CUFF.proud, th: q.th + 2 * CUFF.proud };
  });
  for (const a of RIBS) b.add(fin(a, cuff), of.bronze);

  // The observation level: a ring of glass on the top deck, and its roof with a copper brow.
  b.add(cyl(SKY.r, SKY.to - SKY.from, 96, SKY.r, true).translate(0, (SKY.from + SKY.to) / 2, 0), of.pod);
  const rt = SKY.to, rr = SKY.r + 0.9;
  turn(b, [[rr - 0.2, rt], [rr, rt + 0.2], [rr, rt + SKY.roof - 0.2], [rr - 0.25, rt + SKY.roof]], of.copper, 72);
  turn(b, [[rr - 0.25, rt + SKY.roof], [lanternR(rt + SKY.roof) + 0.6, rt + SKY.roof + 0.6]], of.dark, 72);
  b.add(cyl(SKY.r - 0.3, 0.5, 72, SKY.r - 0.3, false).translate(0, rt - 0.2, 0), of.dark);
  // Fins round the observation level's glass, which shade it and stand its light back from the face.
  const [fw, fd] = SKY.fin, fh = SKY.to - SKY.from;
  for (let i = 0; i < SKY.fins; i++) {
    const a = ((i + 0.5) / SKY.fins) * Math.PI * 2, r = SKY.r + fd / 2 - 0.1;
    b.add(new THREE.BoxGeometry(fw, fh, fd), of.dark, xf({ p: [Math.sin(a) * r, (SKY.from + SKY.to) / 2, Math.cos(a) * r], r: [0, a, 0] }), false);
  }

  // The crown: the lantern the ribs close round, and the collar they gather into.
  const lp: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) { const y = LANTERN.from + ((LANTERN.to - LANTERN.from) * i) / 14; lp.push(new THREE.Vector2(lanternR(y), y)); }
  b.add(new THREE.LatheGeometry(lp, 48), of.lantern);
  const cy = COLLAR.y, ch = COLLAR.h / 2;
  turn(b, [[2.2, cy - ch], [COLLAR.r - 0.4, cy - ch], [COLLAR.r, cy - ch + 0.4], [COLLAR.r, cy + ch - 0.4], [COLLAR.r - 0.4, cy + ch], [2.8, cy + ch]], of.copper, 48);

  // The needle and its rings, the beacon's lens, and the spike over it.
  turn(b, NEEDLE, of.dark, 32);
  for (const r of NEEDLE_RINGS) turn(b, [[r.r - 0.8, r.y - r.h / 2], [r.r, r.y - r.h / 2 + 0.2], [r.r, r.y + r.h / 2 - 0.2], [r.r - 0.8, r.y + r.h / 2]], of.copper, 32);
  const lens: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) { const k = i / 10; lens.push(new THREE.Vector2(0.55 + (BEACON.r - 0.55) * Math.sin(k * Math.PI) ** 0.6, BEACON.from + (BEACON.to - BEACON.from) * k)); }
  b.add(new THREE.LatheGeometry(lens, 20), of.beacon, undefined, false);
  turn(b, [[0.55, BEACON.to], [0.01, BEACON.tip]], of.dark, 12);

  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; blinks.push(new THREE.Vector3(Math.sin(a) * (SKY.r + 0.9), SKY.to + SKY.roof + 0.3, Math.cos(a) * (SKY.r + 0.9))); }
  for (const p of blinks) b.add(new THREE.OctahedronGeometry(0.5).translate(p.x, p.y, p.z), of.blink, undefined, false);

  const tris = b.tris, meshes = b.build(group);
  return { group, tris, meshes };
}
