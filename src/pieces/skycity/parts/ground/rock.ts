import * as THREE from 'three';
import { seeded, slice } from '../../../../world/build';
import { KEEL, POD, RIB, ROCK, D2R, reach, ribAngles, ringNoise, seen, strata } from './shape';

// The rock under the city: strata hung one under another, each a little smaller than the one above, so the mass
// narrows to the keel. Each stratum's face leans out a little to a lip and is undercut beneath it. Each is broken
// into blocks along its joints, every block standing a little in or out of its neighbours, and the strata swell and
// pinch round the circle. A channel is cut down it for every rib, wider where the rib's housing sits.
// One grid: its columns run down the rock and its rows follow the strata, with columns kept at set distances either
// side of each rib so the channels' walls are sharp at every depth.

// Where in a stratum each row is, from its top: the face, its lip, and the undercut back to the next stratum.
const ROWS = [0, 0.45, 0.8, 0.87, 0.94];
// The rows of a stratum that are under its lip.
const UNDER = 3;
// Columns either side of a rib, in units from its middle: the channel's floor, its wall, the housing's wider cut.
const AT_RIB = [0, 3.4, RIB.half + RIB.clear - 0.4, RIB.half + RIB.clear + 0.4, POD.r + 2.4, POD.r + 3.4, 24];
const SIDE = AT_RIB[AT_RIB.length - 1];
// Columns between two ribs: more toward the front, which is what is seen.
const across = (mid: number) => (seen(mid) ? 22 : 4);

interface Block { to: number; out: number; drop: number; tone: number; lean: number }

export async function rock(): Promise<THREE.BufferGeometry> {
  const tops = strata(), n = tops.length - 1, r = seeded(771);
  const swell = ringNoise(12, [[3, 0.012], [5, 0.009], [8, 0.006], [13, 0.004]]);
  // How each boundary between strata rises and falls round the circle.
  const tilt = tops.map((_, i) => (i === 0 || i === n ? () => 0 : ringNoise(100 + i, [[2, 0.18], [4, 0.14], [7, 0.1], [11, 0.06]])));
  const thick = tops.map((t, i) => (i < n ? tops[i + 1] - t : 12));
  // The whole bed is tilted, dipping down toward the visitor's left, so the strata run across the rock at a slant and
  // are not a stack of level plates.
  const dip = (deg: number) => 16 * Math.sin((deg - 20) * D2R) + 4 * Math.sin(2 * deg * D2R + 1.3);
  // The joints. Most run down through several strata at once, so the blocks either side of one stand in or out
  // together and the rock is broken into buttresses and gullies; a few are a stratum's own. Each stratum's blocks
  // take most of how far out they stand from the buttress they belong to.
  const master: { to: number; out: number }[] = [];
  for (let a = r() * 4; a < 370;) { a += ((26 + 70 * r()) / 420) / D2R; master.push({ to: a, out: (r() - 0.55) * 0.9 }); }
  const blocks: Block[][] = [];
  for (let k = 0; k < n; k++) {
    const list: Block[] = [];
    for (let i = 0; i < master.length; i++) {
      const m = master[i], from = i ? master[i - 1].to : 0;
      if (r() < 0.45 && m.to - from > 3) list.push({ to: from + (m.to - from) * (0.3 + 0.4 * r()), out: m.out * 0.7 + (r() - 0.55) * 0.35, drop: (r() - 0.5) * 0.5, tone: r(), lean: 0.2 + 1.1 * r() });
      if (r() < 0.22 && i + 1 < master.length) continue;
      list.push({ to: m.to, out: m.out * 0.7 + (r() - 0.55) * 0.35, drop: (r() - 0.5) * 0.5, tone: r(), lean: 0.2 + 1.1 * r() });
    }
    blocks.push(list);
  }
  const block = (k: number, deg: number): Block => {
    const list = blocks[Math.min(k, n - 1)], a = ((deg % 360) + 360) % 360;
    for (const b of list) if (a < b.to) return b;
    return list[list.length - 1];
  };
  // The depth of the top of stratum k at a bearing: its boundary's tilt, and where a block drops its own bottom a
  // little, the next stratum starts there.
  const memo = new Map<number, number>();
  const top = (k: number, deg: number): number => {
    if (k <= 0) return tops[0];
    if (k >= n) return tops[n];
    const key = Math.round(deg * 1e4) * 64 + k, had = memo.get(key);
    if (had !== undefined) return had;
    const v = topOf(k, deg);
    memo.set(key, v);
    return v;
  };
  const topOf = (k: number, deg: number): number => {
    const own = tilt[k](deg) * thick[k - 1] + block(k - 1, deg).drop * 0.65 * Math.min(thick[k - 1], thick[k]);
    return Math.min(tops[n] - 2.5 * (n - k), Math.max(top(k - 1, deg) + 2.5, tops[k] + own + dip(deg) * Math.sin((Math.PI * k) / n)));
  };
  // How far out the face of stratum k stands at a bearing.
  const outAt = (k: number, deg: number) => {
    const d = top(k, deg), base = reach(d) * (1 + swell(deg));
    if (k >= n) return base;
    const w = Math.max(6, reach(d) - reach(top(k + 1, deg)));
    return base + block(k, deg).out * w * (1 - (0.45 * k) / n);
  };

  // The columns: each a bearing at every depth.
  const ribs = ribAngles(), step = 360 / RIB.n;
  // Near the keel the ribs close in on each other: the columns kept beside them close in too.
  const narrow = (d: number) => Math.min(1, (0.4 * step * D2R * reach(d)) / SIDE);
  type Col = { deg: (d: number) => number; s: number | null };
  const cols: Col[] = [];
  for (let j = 0; j < RIB.n; j++) {
    const phi = ribs[j];
    const at = seen(phi) ? AT_RIB : [0, SIDE];
    for (const s of [...at.slice(1).reverse().map((v) => -v), ...at]) cols.push({ deg: (d) => phi + ((s * narrow(d)) / reach(d)) / D2R, s });
    const m = across(phi + step / 2);
    for (let i = 1; i <= m; i++) {
      const t = i / (m + 1);
      cols.push({ deg: (d) => { const off = ((SIDE * narrow(d)) / reach(d)) / D2R; return phi + off + (step - 2 * off) * t; }, s: null });
    }
  }

  const pos: number[] = [], cell: number[] = [];
  const nc = cols.length;
  let rows = 0;
  const vert = (deg: number, d: number, rr: number, k: number, f: number, tone: number, under: number, dressed = 0) => {
    const t = deg * D2R;
    pos.push(Math.sin(t) * rr, -d, Math.cos(t) * rr);
    cell.push(k + f, tone, under, dressed);
  };
  const cut = (c: Col, d: number, rr: number) => {
    if (c.s === null) return rr;
    // The channel's floor, then its walls cut back on a slant, so the rib can be seen from the side as well.
    const pod = Math.abs(d - POD.d) < POD.tall / 2 + 4;
    const half = pod ? POD.r + 2.9 : RIB.half + RIB.clear, s = Math.abs(c.s) * narrow(d);
    return Math.min(rr, reach(d) - RIB.deep + Math.max(0, s - half * narrow(d)) * 1.9);
  };

  // A row closed in under the rim, out of sight.
  for (const c of cols) { const deg = c.deg(tops[0]); vert(deg, tops[0], ROCK.r0 - 40, 0, 0, 0.5, 1); }
  rows++;
  for (let k = 0; k < n; k++) {
    for (let ri = 0; ri < ROWS.length; ri++) {
      const f = ROWS[ri];
      for (const c of cols) {
        const deg0 = c.deg(tops[k]);
        const a = top(k, deg0), b = top(k + 1, deg0), d = a + f * (b - a);
        const deg = c.deg(d);
        const face = outAt(k, deg), next = outAt(k + 1, deg), h = b - a;
        const lean = Math.min(0.3 * h, 0.4 * Math.max(0, face - next)) * block(k, deg).lean;
        const eros = (Math.sin(deg * 7.3 + k * 1.9) * 0.6 + Math.sin(deg * 23.1 + d * 0.21) * 0.4) * 0.7;
        let rr: number;
        if (f <= 0.8) rr = face + lean * Math.pow(f / 0.8, 1.4) + eros * (f > 0 ? 1 : 0.3);
        else {
          const lip = face + lean + eros, w = Math.max(0, lip - next);
          rr = next + w * (f < 0.9 ? 0.55 : 0.18);
        }
        // The last stratum is dressed where the keel is set into it: a clean band the keel's flange lands on.
        if (k === n - 1) { vert(deg, d, reach(a) + 2 + (KEEL.flange + 3 - reach(a) - 2) * f, k, f, 0.5, 0, 1); continue; }
        const was = rr;
        rr = cut(c, d, rr);
        vert(deg, d, rr, k, f, block(k, deg).tone, ri >= UNDER && rr === was ? 1 : 0, rr < was - 0.5 ? 1 : 0);
      }
      rows++;
      await slice();
    }
  }
  // The bottom of the last stratum, then closed in toward the middle, inside the keel's collar.
  for (const c of cols) { const deg = c.deg(tops[n]); vert(deg, tops[n], KEEL.flange + 3, n, 0, 0.5, 0, 1); }
  rows++;
  for (const c of cols) { const deg = c.deg(tops[n]); vert(deg, tops[n] + 3, 30, n, 0, 0.5, 1); }
  rows++;

  const idx: number[] = [];
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < nc; i++) {
    const a = j * nc + i, b = j * nc + ((i + 1) % nc), c = a + nc, d = b + nc;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
