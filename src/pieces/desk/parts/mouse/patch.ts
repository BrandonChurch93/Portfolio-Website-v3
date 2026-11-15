import * as THREE from 'three';
import type { V2 } from './shape';

// Surfaces the mouse is made of: sheets laid over a grid, closed bands round the body, and the chamfer and the edge
// that every separate part of the shell has, so each part is a real piece with a gap round it.

type V3 = THREE.Vector3;

// A curve resampled to n + 1 points evenly along its length.
export function resample(f: (s: number) => V2, n: number): V2[] {
  const m = 400, pts: V2[] = [], len = [0];
  for (let i = 0; i <= m; i++) pts.push(f(i / m));
  for (let i = 1; i <= m; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out: V2[] = [];
  for (let k = 0, i = 0; k <= n; k++) {
    const want = (k / n) * len[m];
    while (i < m - 1 && len[i + 1] < want) i++;
    const t = (want - len[i]) / Math.max(1e-9, len[i + 1] - len[i]);
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
  }
  return out;
}

// A patch bounded by four curves (Coons): c0 and c1 run along u at v = 0 and v = 1, d0 and d1 along v at u = 0 and
// u = 1, and their ends meet at the corners. Rows are v, columns u.
export function coons(c0: V2[], c1: V2[], d0: V2[], d1: V2[]): V2[][] {
  const nu = c0.length - 1, nv = d0.length - 1, out: V2[][] = [];
  const [a, b, c, d] = [c0[0], c0[nu], c1[0], c1[nu]];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv, row: V2[] = [];
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const k = (q: 0 | 1) => (1 - v) * c0[i][q] + v * c1[i][q] + (1 - u) * d0[j][q] + u * d1[j][q]
        - ((1 - u) * (1 - v) * a[q] + u * (1 - v) * b[q] + (1 - u) * v * c[q] + u * v * d[q]);
      row.push([k(0), k(1)]);
    }
    out.push(row);
  }
  return out;
}

// Turns a geometry round if most of its normals point against the way they should.
function orient(g: THREE.BufferGeometry, want: (p: V3, n: V3) => number): THREE.BufferGeometry {
  g.computeVertexNormals();
  const p = g.getAttribute('position'), nm = g.getAttribute('normal'), a = new THREE.Vector3(), b = new THREE.Vector3();
  let vote = 0;
  for (let i = 0; i < p.count; i++) vote += Math.sign(want(a.fromBufferAttribute(p, i), b.fromBufferAttribute(nm, i)));
  if (vote < 0) {
    const ix = g.getIndex()!;
    for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); }
    g.computeVertexNormals();
  }
  return g;
}

function kindOf(g: THREE.BufferGeometry, kind: number): THREE.BufferGeometry {
  const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) cell[i * 4 + 3] = kind;
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  return g;
}

// A sheet over a grid of points, rows by columns, open at its edges.
export function sheet(grid: V3[][], kind: number, want: (p: V3, n: V3) => number): THREE.BufferGeometry {
  const rows = grid.length, cols = grid[0].length, pos: number[] = [], idx: number[] = [];
  for (const row of grid) for (const v of row) pos.push(v.x, v.y, v.z);
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return kindOf(orient(g, want), kind);
}

// Closed loops of the same length joined into a band.
export function band(loops: V3[][], kind: number, want: (p: V3, n: V3) => number): THREE.BufferGeometry {
  const n = loops[0].length, pos: number[] = [], idx: number[] = [];
  for (const l of loops) for (const v of l) pos.push(v.x, v.y, v.z);
  for (let j = 0; j < loops.length - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + ((i + 1) % n), c = a + n, d = b + n;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return kindOf(orient(g, want), kind);
}

// A part of the shell over a grid: its face, a chamfer all round its edge that falls ch out and ch down, and its edge
// running depth down into the gap. The chamfer is what catches a pale line; the edge is the dark of the gap.
export function panel(grid: V3[][], face: number, chamfer: number, edge: number, ch: number, depth: number, up: (p: V3) => V3, normal?: (p: V3) => V3): THREE.BufferGeometry[] {
  const top = sheet(grid, face, (p, n) => n.dot(up(p)));
  if (normal) {
    const pos = top.getAttribute('position'), nm0 = top.getAttribute('normal'), p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { const n = normal(p.fromBufferAttribute(pos, i)); nm0.setXYZ(i, n.x, n.y, n.z); }
  }
  const rows = grid.length, cols = grid[0].length, nm = top.getAttribute('normal');
  const at = (j: number, i: number) => new THREE.Vector3().fromBufferAttribute(nm, j * cols + i);
  // The edge loop, round the grid, and the point one step in from each.
  const loop: [number, number, number, number][] = [];
  for (let i = 0; i < cols - 1; i++) loop.push([0, i, i === 0 ? 1 : 1, i === 0 ? 1 : i]);
  for (let j = 0; j < rows - 1; j++) loop.push([j, cols - 1, j === 0 ? 1 : j, cols - 2]);
  for (let i = cols - 1; i > 0; i--) loop.push([rows - 1, i, rows - 2, i === cols - 1 ? cols - 2 : i]);
  for (let j = rows - 1; j > 0; j--) loop.push([j, 0, j === rows - 1 ? rows - 2 : j, 1]);
  const a: V3[] = [], b: V3[] = [], c: V3[] = [], outs: V3[] = [];
  // Out is square to the edge loop itself, so a corner of the grid that lies on a smooth edge leaves no kink.
  for (let k = 0; k < loop.length; k++) {
    const [j, i, jj, ii] = loop[k], p = grid[j][i], n = at(j, i);
    const [j0, i0] = loop[(k + loop.length - 1) % loop.length], [j1, i1] = loop[(k + 1) % loop.length];
    const o = grid[j1][i1].clone().sub(grid[j0][i0]).cross(n).normalize();
    if (o.dot(p.clone().sub(grid[jj][ii])) < 0) o.negate();
    const q = p.clone().addScaledVector(o, ch).addScaledVector(n, -ch);
    a.push(p.clone()); b.push(q); c.push(q.clone().addScaledVector(n, -depth)); outs.push(o);
  }
  const mid = new THREE.Vector3();
  for (const row of grid) for (const v of row) mid.add(v);
  mid.divideScalar(rows * cols);
  const away = (p: V3, n: V3) => { const d = p.clone().sub(mid); d.y = 0; return n.dot(d) + 0.2 * n.dot(up(p)); };
  return [top, band([a, b], chamfer, away), band([b, c], edge, away)];
}
