// The light baker's self check: scenes whose answers are known in closed form, each with real numeric assertions,
// then a timing on a cave of about a million triangles. Prints PASS or FAIL per check and exits non zero on any
// failure.
//
//   node scripts/world/lib/check-bake.mjs            all of it
//   node scripts/world/lib/check-bake.mjs --quick    without the timing
import os from 'node:os';
import process from 'node:process';
import { bake, direct, illum } from './bake.mjs';
import { any, build, closest } from './bvh.mjs';

const quick = process.argv.includes('--quick');
let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const fmt = (x, d = 4) => Number(x).toFixed(d);

// A grid of quads from corner c along u and w (each a vector the length of a side), facing u × w.
function grid(c, u, w, nu, nw) {
  const nx = u[1] * w[2] - u[2] * w[1], ny = u[2] * w[0] - u[0] * w[2], nz = u[0] * w[1] - u[1] * w[0];
  const l = Math.hypot(nx, ny, nz);
  const positions = [], normals = [], indices = [];
  for (let j = 0; j <= nw; j++) for (let i = 0; i <= nu; i++) {
    const a = i / nu, b = j / nw;
    positions.push(c[0] + u[0] * a + w[0] * b, c[1] + u[1] * a + w[1] * b, c[2] + u[2] * a + w[2] * b);
    normals.push(nx / l, ny / l, nz / l);
  }
  for (let j = 0; j < nw; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, d = a + nu + 1, e = d + 1;
    indices.push(a, b, e, a, e, d);
  }
  return { positions, normals, indices };
}

function join(parts) {
  const positions = [], normals = [], indices = [];
  for (const p of parts) {
    const base = positions.length / 3;
    positions.push(...p.positions); normals.push(...p.normals);
    for (const i of p.indices) indices.push(i + base);
  }
  return { positions, normals, indices };
}

const mesh = (name, g, extra) => ({
  name, positions: Float32Array.from(g.positions), normals: Float32Array.from(g.normals), indices: Uint32Array.from(g.indices),
  albedo: [0, 0, 0], receive: true, ...extra,
});

// The six faces of a box from lo to hi, each its own grid, facing out, or in when inward. n is the cells along each
// side, or [x, y, z] for each axis.
function box(lo, hi, n, inward = false) {
  const [x0, y0, z0] = lo, [x1, y1, z1] = hi, X = x1 - x0, Y = y1 - y0, Z = z1 - z0;
  const [a, b, c] = Array.isArray(n) ? n : [n, n, n];
  const faces = [
    grid([x1, y0, z0], [0, Y, 0], [0, 0, Z], b, c),
    grid([x0, y0, z0], [0, 0, Z], [0, Y, 0], c, b),
    grid([x0, y1, z0], [0, 0, Z], [X, 0, 0], c, a),
    grid([x0, y0, z0], [X, 0, 0], [0, 0, Z], a, c),
    grid([x0, y0, z1], [X, 0, 0], [0, Y, 0], a, b),
    grid([x0, y0, z0], [0, Y, 0], [X, 0, 0], b, a),
  ];
  const g = join(faces);
  if (inward) {
    for (let i = 0; i < g.normals.length; i++) g.normals[i] = -g.normals[i];
    for (let i = 0; i < g.indices.length; i += 3) { const s = g.indices[i + 1]; g.indices[i + 1] = g.indices[i + 2]; g.indices[i + 2] = s; }
  }
  return g;
}

// The same box with its edges welded, each welded vertex taking the mean of the faces it is on as its normal.
function weld(g) {
  const key = new Map(), positions = [], sums = [], remap = [];
  for (let i = 0; i < g.positions.length / 3; i++) {
    const k = `${g.positions[i * 3].toFixed(5)},${g.positions[i * 3 + 1].toFixed(5)},${g.positions[i * 3 + 2].toFixed(5)}`;
    let j = key.get(k);
    if (j === undefined) { j = positions.length / 3; key.set(k, j); positions.push(g.positions[i * 3], g.positions[i * 3 + 1], g.positions[i * 3 + 2]); sums.push(new Set()); }
    sums[j].add(`${g.normals[i * 3]},${g.normals[i * 3 + 1]},${g.normals[i * 3 + 2]}`);
    remap.push(j);
  }
  const normals = [];
  for (const s of sums) {
    let x = 0, y = 0, z = 0;
    for (const t of s) { const [a, b, c] = t.split(',').map(Number); x += a; y += b; z += c; }
    const l = Math.hypot(x, y, z);
    normals.push(x / l, y / l, z / l);
  }
  return { positions, normals, indices: g.indices.map((i) => remap[i]), faces: sums.map((s) => s.size) };
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const range = (arr, pick) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < arr.length; i++) if (!pick || pick(i)) { lo = Math.min(lo, arr[i]); hi = Math.max(hi, arr[i]); } return [lo, hi]; };

async function bvhCheck() {
  const g = box([-1, -1, -1], [1, 1, 1], 8);
  const bvh = build(Float32Array.from(g.positions), Uint32Array.from(g.indices));
  const hit = new Float64Array(4);
  let ok = true, worst = 0;
  let s = 12345;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  for (let i = 0; i < 2000; i++) {
    const ox = rnd() * 1.6 - 0.8, oy = rnd() * 1.6 - 0.8, oz = rnd() * 1.6 - 0.8;
    let dx = rnd() - 0.5, dy = rnd() - 0.5, dz = rnd() - 0.5;
    const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    const tx = ((dx > 0 ? 1 : -1) - ox) / dx, ty = ((dy > 0 ? 1 : -1) - oy) / dy, tz = ((dz > 0 ? 1 : -1) - oz) / dz;
    const want = Math.min(tx, ty, tz);
    const t = closest(bvh, ox, oy, oz, dx, dy, dz, Infinity, hit);
    if (t < 0 || hit[3] !== 0) ok = false;
    worst = Math.max(worst, Math.abs(hit[0] - want));
    if (!any(bvh, ox, oy, oz, dx, dy, dz, want + 1e-3) || any(bvh, ox, oy, oz, dx, dy, dz, want - 1e-3)) ok = false;
  }
  check('bvh: rays from inside a box meet its walls at the analytic distance, from the back, and any() agrees', ok && worst < 1e-5, `worst error ${worst.toExponential(2)}`);
}

async function openSky() {
  const sky = [0.02, 0.03, 0.05];
  const floor = mesh('floor', grid([-200, 0, 200], [400, 0, 0], [0, 0, -400], 40, 40), { albedo: [0.5, 0.5, 0.5] });
  const scene = {
    meshes: [floor],
    moon: { toward: [0.3, 0.8, 0.2], color: [1, 1, 1], spread: 0.01 },
    core: { at: [0, 300, 0], r: 20, color: [1, 0.5, 0.1], fall: 2 }, sky,
  };
  const lit = (await bake(scene, { bounces: 2 })).floor;
  const [o0] = range(lit.open), [m0] = range(lit.moon), [c0] = range(lit.core);
  let worst = 0;
  for (let i = 0; i < lit.bounce.length; i++) worst = Math.max(worst, Math.abs(lit.bounce[i] - sky[i % 3] * Math.PI));
  let bentOff = 0;
  for (let i = 0; i < lit.bent.length / 3; i++) bentOff = Math.max(bentOff, 1 - lit.bent[i * 3 + 1]);
  check('1 open sky: open is 1 at every vertex', o0 === 1, `least ${o0}`);
  check('1 open sky: the moon is seen whole at every vertex', m0 === 1, `least ${m0}`);
  check('1 open sky: the core above is seen whole at every vertex', c0 === 1, `least ${c0}`);
  check('1 open sky: bounce is sky × π, with two bounces', worst < 1e-6, `worst error ${worst.toExponential(2)}`);
  check('1 open sky: the bent normal is the normal', bentOff < 0.02, `most off ${fmt(bentOff)}`);
}

async function moonEdge() {
  const spread = 0.05, h = 100, bias = 0.05;
  const floor = mesh('floor', grid([-20, 0, 2], [40, 0, 0], [0, 0, -4], 80, 8));
  const roof = mesh('roof', grid([-1000, h, -1000], [1000, 0, 0], [0, 0, 2000], 1, 1), { receive: false });
  const scene = { meshes: [floor, roof], moon: { toward: [0, 1, 0], color: [1, 1, 1], spread }, core: null, sky: [0, 0, 0] };
  const want = (x) => {
    const tau = (-x / (h - bias)) / Math.tan(spread);
    if (tau <= -1) return 1;
    if (tau >= 1) return 0;
    return (Math.acos(tau) - tau * Math.sqrt(1 - tau * tau)) / Math.PI;
  };
  for (const n of [1024, 16]) {
    const lit = (await bake(scene, { samples: { core: 0, moon: n, hemi: 4 }, bounces: 1, bias })).floor;
    let worst = 0, dark = 0, clear = 1, sum = 0, count = 0;
    for (let i = 0; i < lit.moon.length; i++) {
      const x = floor.positions[i * 3], e = Math.abs(lit.moon[i] - want(x));
      worst = Math.max(worst, e);
      if (Math.abs(x) < 5) { sum += e; count++; }
      if (x < -6) dark = Math.max(dark, lit.moon[i]);
      if (x > 6) clear = Math.min(clear, lit.moon[i]);
    }
    check(`2 moon behind an edge, ${n} samples: share 0 in the shadow, 1 clear of it`, dark === 0 && clear === 1, `most in shadow ${dark}, least clear ${clear}`);
    if (n >= 1024) check(`2 moon behind an edge, ${n} samples: the penumbra follows the disc's area at every vertex to within 0.01`, worst <= 0.01, `worst error ${fmt(worst)}`);
    else check(`2 moon behind an edge, ${n} samples: the penumbra follows the disc's area, mean error under 0.05, worst under 0.2`, sum / count < 0.05 && worst < 0.2, `mean error ${fmt(sum / count)}, worst ${fmt(worst)}`);
  }
}

async function enclosure() {
  const a = 0.5, half = 50, r = 5, fall = 2, color = [3, 2, 1];
  const g = box([-half, -half, -half], [half, half, half], 24, true);
  const room = mesh('room', g, { albedo: [a, a, a] });
  const scene = { meshes: [room], moon: null, core: { at: [0, 0, 0], r, color, fall }, sky: [0, 0, 0] };
  const n = room.positions.length / 3, weight = new Float64Array(n);
  for (let i = 0; i < room.indices.length; i += 3) {
    const p = room.indices.slice(i, i + 3), P = [...p].map((j) => [0, 1, 2].map((k) => room.positions[j * 3 + k]));
    const u = [0, 1, 2].map((k) => P[1][k] - P[0][k]), w = [0, 1, 2].map((k) => P[2][k] - P[0][k]);
    const area = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
    for (const j of p) weight[j] += area / 3;
  }
  const mean = (f) => { let s = 0, ws = 0; for (let i = 0; i < n; i++) { s += f(i) * weight[i]; ws += weight[i]; } return s / ws; };
  const totals = {};
  let D = 0;
  for (const bounces of [1, 2, 6]) {
    const lit = await bake(scene, { bounces, samples: { core: 16, moon: 0, hemi: 256 } });
    const E = direct(scene, lit).room;
    if (bounces === 1) {
      let worst = 0;
      const wantMid = color[0] * Math.pow(r / half, fall) * illum(1, r / half);
      for (let i = 0; i < n; i++) {
        const p = [0, 1, 2].map((k) => Math.abs(room.positions[i * 3 + k]));
        if (p.filter((x) => x < 1e-6).length === 2) worst = Math.max(worst, Math.abs(E[i * 3] - wantMid) / wantMid);
      }
      check('3 closed box: direct light at the middle of each face matches the formula', worst < 1e-5, `worst ${fmt(worst * 100, 5)}%`);
      const [c0] = range(lit.room.core);
      check('3 closed box: the core is seen whole from every vertex of the inside', c0 === 1, `least ${c0}`);
      D = mean((i) => E[i * 3]);
    }
    totals[bounces] = mean((i) => E[i * 3] + lit.room.bounce[i * 3]);
  }
  const want = (k) => D * (1 - a ** (k + 1)) / (1 - a);
  const err = (k) => Math.abs(totals[k] - want(k)) / want(k);
  check('3 closed box: total after 1, 2 and 6 bounces matches direct × (1 - a^(k+1)) / (1 - a)',
    err(1) < 0.01 && err(2) < 0.01 && err(6) < 0.015,
    `${[1, 2, 6].map((k) => `${k}: ${fmt(totals[k] / D)} of direct, closed form ${fmt(want(k) / D)}`).join(', ')}`);
  check('3 closed box: the totals rise with bounces and close on direct / (1 - a)',
    totals[1] < totals[2] && totals[2] < totals[6] && Math.abs(totals[6] - D / (1 - a)) < Math.abs(totals[2] - D / (1 - a)),
    `limit ${fmt(1 / (1 - a))} of direct`);
}

async function creases() {
  const moon = { toward: [1, 1, 0.3], color: [1, 1, 1], spread: 0.02 };
  for (const smooth of [false, true]) {
    const split = box([-5, -5, -5], [5, 5, 5], 10);
    const g = smooth ? weld(split) : split;
    const cube = mesh('cube', g);
    const scene = { meshes: [cube], moon, core: null, sky: [0.1, 0.1, 0.1] };
    const lit = (await bake(scene, { samples: { core: 0, moon: 64, hemi: 256 }, bounces: 2 })).cube;
    const P = cube.positions, N = cube.normals, n = P.length / 3;
    const onEdge = (i) => [0, 1, 2].filter((k) => Math.abs(Math.abs(P[i * 3 + k]) - 5) < 1e-6).length >= 2;
    const facing = (i) => N[i * 3] + N[i * 3 + 1] + N[i * 3 + 2] * 0.3 > 0.05;
    const [eo] = range(lit.open, onEdge), [io] = range(lit.open, (i) => !onEdge(i));
    const [em] = range(lit.moon, (i) => onEdge(i) && facing(i)), [im] = range(lit.moon, (i) => !onEdge(i) && facing(i));
    let worst = 0;
    for (let i = 0; i < lit.bounce.length; i++) worst = Math.max(worst, Math.abs(lit.bounce[i] - 0.1 * Math.PI));
    const label = smooth ? 'welded, normals averaged at the edges' : 'split at the edges';
    check(`4 convex cube, ${label}: open on the edges is as on the faces`, eo >= io - 1e-6 && eo === 1, `least on an edge ${eo}, on a face ${io}, of ${n} vertices`);
    check(`4 convex cube, ${label}: moon on the lit edges is as on the lit faces`, em >= im - 1e-6 && em === 1, `least on an edge ${em}, on a face ${im}`);
    check(`4 convex cube, ${label}: bounce is the sky's alone everywhere`, worst < 1e-6, `worst error ${worst.toExponential(2)}`);
  }

  const wallT = 0.1, H = 10, w = wallT / 2;
  const parts = box([-w, 0, -12], [w, H, 12], 8);
  const wall = () => mesh('wall', join([0, 1, 2, 4, 5].map((f) => {
    const per = parts.positions.length / 3 / 6, tri = parts.indices.length / 6;
    return {
      positions: parts.positions.slice(f * per * 3, (f + 1) * per * 3),
      normals: parts.normals.slice(f * per * 3, (f + 1) * per * 3),
      indices: parts.indices.slice(f * tri, (f + 1) * tri).map((i) => i - f * per),
    };
  })), { albedo: [0.6, 0.6, 0.6] });
  const light = { moon: { toward: [1, 0.15, 0], color: [0, 0, 0], spread: 0.02 }, core: { at: [3, 1, 0], r: 0.5, color: [5, 3, 1], fall: 2 }, sky: [0, 0, 0] };
  const floors = {
    'a floor cut at the wall, its edges on the wall\'s feet': join([
      grid([-10, 0, 10], [10 - w, 0, 0], [0, 0, -20], 20, 40),
      grid([w, 0, 10], [10 - w, 0, 0], [0, 0, -20], 20, 40),
    ]),
    'a floor whose triangles run on under the wall': grid([-10.25, 0, 10], [20.5, 0, 0], [0, 0, -20], 41, 40),
  };
  for (const [label, g] of Object.entries(floors)) {
    const floor = mesh('floor', g, { albedo: [0.6, 0.6, 0.6] }), walls = wall();
    const lit = await bake({ meshes: [floor, walls], ...light }, { samples: { core: 256, moon: 64, hemi: 256 }, bounces: 2 });
    const F = floor.positions, Wp = walls.positions, Wn = walls.normals;
    const behind = (i) => F[i * 3] < 0;
    const [, fc] = range(lit.floor.core, behind), [, fm] = range(lit.floor.moon, behind), [, fb] = range(lit.floor.bounce, (i) => behind((i / 3) | 0));
    const [, wb] = range(lit.wall.bounce, (i) => Wn[((i / 3) | 0) * 3] < -0.5);
    const corner = (i) => F[i * 3] > 0 && F[i * 3] < 0.5 && Math.abs(F[i * 3 + 2]) < 5;
    const foot = (i) => Wn[i * 3] > 0.5 && Wp[i * 3 + 1] < 1e-6 && Math.abs(Wp[i * 3 + 2]) < 5;
    const [cf] = range(lit.floor.core, corner), [cw] = range(lit.wall.core, foot);
    check(`4 thin wall 0.1 thick, ${label}: no floor vertex behind it sees the core or the moon, even at its foot`, fc === 0 && fm === 0, `most core ${fc}, most moon ${fm}`);
    check(`4 thin wall, ${label}: the concave corner at its lit foot sees the core whole, on the floor and on the wall`, cf === 1 && cw === 1, `least on the floor ${cf}, on the wall ${cw}`);
    if (label.startsWith('a floor cut')) {
      check(`4 thin wall, ${label}: no bounced light behind it, on the floor or its dark face`, fb === 0 && wb === 0, `most on the floor ${fb}, on the face ${wb}`);
    } else {
      const [, lb] = range(lit.floor.bounce, (i) => !behind((i / 3) | 0));
      console.log(`NOTE  4 thin wall, ${label}: light carried under it by the floor's own interpolation, ${fmt(wb / lb * 100, 3)}% of the lit side's most on its dark face, ${fmt(fb / lb * 100, 3)}% on the floor behind`);
    }
  }
}

// A floor and a plate meeting along the z axis at angle a, the plate over the floor with its front into the gap,
// the vertices split at the crease. Only strips 4 triangles wide on either side of the crease receive. As a slab
// the plate is the underside of rock 0.5 thick, closed at the crease, so a ray started past the plate is inside it.
// As a sheet it is the plate alone, so a ray started past it sees the moon. From the crease the open sky is the
// wedge alone, whose cosine weighted share is (1 - cos a) / 2, and the moon straight up is never seen under it.
function wedge(deg, h, slab) {
  const a = deg * Math.PI / 180, L = 20, W = 5, near = 4 * h, nz = Math.round(2 * W / h);
  const e = [Math.cos(a), Math.sin(a), 0], len = L / Math.cos(a);
  const meshes = [
    mesh('floor', grid([0, 0, -W], [0, 0, 2 * W], [near, 0, 0], nz, 4)),
    mesh('floor far', grid([near, 0, -W], [0, 0, 2 * W], [L - near, 0, 0], 8, 16), { receive: false }),
    mesh('plate', grid([0, 0, -W], e.map((x) => x * near), [0, 0, 2 * W], 4, nz)),
    mesh('plate far', grid([e[0] * near, e[1] * near, -W], e.map((x) => x * (len - near)), [0, 0, 2 * W], 16, 8), { receive: false }),
  ];
  if (slab) {
    const o = [-0.5 * Math.sin(a) - 1e-3, 0.5 * Math.cos(a), 0];
    meshes.push(mesh('top', grid([o[0], o[1], -W], [0, 0, 2 * W], e.map((x) => x * len), 8, 16), { receive: false }));
    meshes.push(mesh('cap', grid([-1e-3, 0, -W], [0, 0, 2 * W], [0, 1, 0], 4, 1), { receive: false }));
  }
  return { a, h, W, scene: { meshes, moon: { toward: [0, 1, 0], color: [1, 1, 1], spread: 0.01 }, core: null, sky: [1, 1, 1] } };
}

async function acute() {
  const HEMI = 1024;
  for (const slab of [true, false]) {
    let worstOpen = 0, worstBounce = 0, darkest = Infinity, mostMoon = 0, where = '', dark = '';
    for (const h of [1, 0.25, 0.05]) for (const deg of [10, 30, 60, 80]) {
      const { a, W, scene } = wedge(deg, h, slab);
      const lit = await bake(scene, { bounces: 1, samples: { core: 0, moon: 16, hemi: HEMI } });
      const want = (1 - Math.cos(a)) / 2;
      for (const name of ['floor', 'plate']) {
        const P = scene.meshes.find((m) => m.name === name).positions, r = lit[name];
        let open = 0, bounce = 0, count = 0;
        for (let i = 0; i < r.open.length; i++) {
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
          if (Math.abs(z) > W - 1) continue;
          if (name === 'floor') mostMoon = Math.max(mostMoon, r.moon[i]);
          if (Math.hypot(x, y) > 1e-6) continue;
          open += r.open[i]; bounce += r.bounce[i * 3]; count++;
          if (r.open[i] / want < darkest) { darkest = r.open[i] / want; dark = `${name} at ${deg}°, triangles ${h}`; }
        }
        const allow = Math.max(0.03 * want, 3 * Math.sqrt(want * (1 - want) / HEMI / count));
        const eo = Math.abs(open / count - want) / allow, eb = Math.abs(bounce / count / Math.PI - want) / allow;
        if (eo > worstOpen) { worstOpen = eo; where = `${name} at ${deg}°, triangles ${h}: ${fmt(open / count)} vs ${fmt(want)}`; }
        worstBounce = Math.max(worstBounce, eb);
      }
    }
    const label = slab ? 'under a slab of rock' : 'under a single sheet';
    check(`4 acute concave creases of 10 to 80°, triangles 1 to 0.05, ${label}: mean open along the crease is (1 - cos a) / 2, within 3% or 3 sigma of the sampling`,
      worstOpen <= 1, `worst ${fmt(worstOpen, 2)} of what is allowed, ${where}`);
    check(`4 acute concave creases, ${label}: mean bounce along the crease is π × sky × (1 - cos a) / 2, within the same`, worstBounce <= 1, `worst ${fmt(worstBounce, 2)} of what is allowed`);
    check(`4 acute concave creases, ${label}: no crease vertex under half its open share`, darkest > 0.5, `least ${fmt(darkest, 3)} of the truth, ${dark}`);
    check(`4 acute concave creases, ${label}: the moon straight up is never seen on the floor under the plate, a unit clear of its open ends`, mostMoon === 0, `most ${mostMoon}`);
  }
}

// A free standing prism whose two long faces meet at a knife edge of 20°, split there. Every face of a convex solid
// sees its whole hemisphere, so open is 1 and the moon over the edge is seen whole on both faces, at the edge too.
async function knife() {
  const a = 20 * Math.PI / 180, H = 10, D = H * Math.tan(a / 2);
  const lo = [-D, 0], hi = [D, 0], tip = [0, H];
  const side = (p, q, n) => grid([p[0], p[1], -5], [0, 0, 10], [q[0] - p[0], q[1] - p[1], 0], 50, n);
  const g = join([side(lo, tip, 50), side(tip, hi, 50), side(hi, lo, 4)]);
  const prism = mesh('prism', g);
  const scene = { meshes: [prism], moon: { toward: [0, 1, 0], color: [1, 1, 1], spread: 0.01 }, core: null, sky: [0.2, 0.2, 0.2] };
  const lit = (await bake(scene, { bounces: 2 })).prism;
  const P = prism.positions, N = prism.normals;
  const edge = (i) => P[i * 3 + 1] > H - 1e-4, up = (i) => N[i * 3 + 1] > 0;
  const [eo] = range(lit.open, edge), [fo] = range(lit.open, (i) => !edge(i) && up(i));
  const [em] = range(lit.moon, edge);
  check('4 convex knife edge of 20°: open on the edge is 1, as on the faces', eo === 1 && fo === 1, `least on the edge ${eo}, on the faces ${fo}`);
  check('4 convex knife edge of 20°: the moon over the edge is seen whole from both faces at the edge', em === 1, `least ${em}`);
}

async function inputs() {
  const floor = (extra) => mesh('floor', grid([0, 0, 0], [0, 0, 1], [1, 0, 0], 2, 2), extra);
  const sky = { moon: null, core: null, sky: [1, 1, 1] };
  let stats = {};
  let lit = await bake({ meshes: [floor({ receive: false })], ...sky }, { stats });
  check('8 a scene where nothing receives: no result, no vertex traced, stats.receivers 0', Object.keys(lit).length === 0 && stats.receivers === 0 && stats.rays === 0,
    `receivers ${stats.receivers}, rays ${stats.rays}`);
  stats = {};
  lit = await bake({ meshes: [], ...sky }, { stats });
  const finite = Object.values(stats).every((x) => Number.isFinite(x));
  check('8 a scene with no meshes: no result, stats all 0 and finite', Object.keys(lit).length === 0 && stats.receivers === 0 && stats.vertices === 0 && finite,
    `receivers ${stats.receivers}, vertices ${stats.vertices}`);
  const bad = {
    'a zero normal': (m) => m.normals.fill(0, 6, 9),
    'a normal that is not a number': (m) => { m.normals[4] = NaN; },
    'no normals': (m) => { delete m.normals; },
    'a position that is not a number': (m) => { m.positions[2] = Infinity; },
  };
  for (const [label, spoil] of Object.entries(bad)) {
    const m = floor();
    spoil(m);
    let said = '';
    try { await bake({ meshes: [m], ...sky }, {}); } catch (e) { said = e.message; }
    check(`8 a mesh with ${label} is refused, naming the mesh`, said.includes('floor'), said || 'baked without a word');
  }
  const lights = { moon: { toward: [0, 1, 0], color: [1, 1, 1], spread: 0.01 }, core: { at: [0, 5, 0], r: 1, color: [1, 1, 1], fall: 2 }, sky: [0.1, 0.1, 0.1] };
  const lamp = () => {
    const m = mesh('lamp', grid([-2, 2, -2], [4, 0, 0], [0, 0, 4], 2, 2), { receive: false });
    m.emit = new Float32Array(m.positions.length).fill(1);
    return m;
  };
  const wrong = {
    'an emit that is not a number': ['lamp', () => { const l = lamp(); l.emit[4] = NaN; return { ...lights, meshes: [floor(), l] }; }],
    'an emit below 0': ['lamp', () => { const l = lamp(); l.emit[0] = -1; return { ...lights, meshes: [floor(), l] }; }],
    'an albedo that is not a number': ['floor', () => ({ ...lights, meshes: [floor({ albedo: [NaN, 0.5, 0.5] })] })],
    'an albedo per vertex above 1': ['floor', () => { const m = floor(); m.albedo = new Float32Array(m.positions.length).fill(0.5); m.albedo[7] = 1.5; return { ...lights, meshes: [m] }; }],
    'moon.toward of length 0': ['moon.toward', () => ({ ...lights, moon: { ...lights.moon, toward: [0, 0, 0] }, meshes: [floor()] })],
    'moon.spread that is not a number': ['moon.spread', () => ({ ...lights, moon: { ...lights.moon, spread: NaN }, meshes: [floor()] })],
    'moon.color that is not a number': ['moon.color', () => ({ ...lights, moon: { ...lights.moon, color: [1, NaN, 1] }, meshes: [floor()] })],
    'core.at that is not a number': ['core.at', () => ({ ...lights, core: { ...lights.core, at: [0, NaN, 0] }, meshes: [floor()] })],
    'core.r that is not a number': ['core.r', () => ({ ...lights, core: { ...lights.core, r: NaN }, meshes: [floor()] })],
    'core.fall that is not a number': ['core.fall', () => ({ ...lights, core: { ...lights.core, fall: undefined }, meshes: [floor()] })],
    'core.color below 0': ['core.color', () => ({ ...lights, core: { ...lights.core, color: [1, -1, 1] }, meshes: [floor()] })],
    'a sky that is not a number': ['sky', () => ({ ...lights, sky: [0, 0, NaN], meshes: [floor()] })],
  };
  for (const [label, [name, make]] of Object.entries(wrong)) {
    let said = '';
    try { await bake(make(), { bounces: 1, samples: { core: 4, moon: 4, hemi: 4 } }); } catch (e) { said = e.message; }
    check(`8 a scene with ${label} is refused, naming ${name}`, said.includes(name), said || 'baked without a word');
  }
  stats = {};
  const half = floor();
  for (let i = 0; i < half.normals.length; i++) half.normals[i] *= 0.5;
  lit = await bake({ meshes: [half], ...sky }, { stats });
  const [o0] = range(lit.floor.open);
  let worst = 0;
  for (let i = 0; i < lit.floor.bounce.length; i++) worst = Math.max(worst, Math.abs(lit.floor.bounce[i] - Math.PI));
  check('8 normals of half length are made unit: open 1 and bounce π under an open sky', o0 === 1 && worst < 1e-6, `least open ${o0}, worst bounce error ${worst.toExponential(2)}`);
}

// Ground, a path and a sunk block, laid as the world's parts are: the ground's triangles run on under the block and
// the path, and a block stands sunk in a ground sheet. A vertex in the open beside each, a little way off, sees the
// moon and the core whole and the open sky the block leaves it. Rays started from points moved in toward the middle
// of each triangle went under the wall, the path and the ground there, and lost about half of all three.
async function feet() {
  const lo = [0, -0.5, -100], hi = [200, 200, 100];
  let s = 99;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const truth = (px) => {
    let open = 0;
    const N = 200000;
    for (let i = 0; i < N; i++) {
      const x = rnd(), y = rnd(), r = Math.sqrt(x), ph = 2 * Math.PI * y;
      const o = [px, 1e-4, 0], d = [r * Math.cos(ph), Math.sqrt(1 - x), r * Math.sin(ph)];
      let t0 = 0, t1 = Infinity;
      for (let k = 0; k < 3; k++) {
        let a = (lo[k] - o[k]) / d[k], b = (hi[k] - o[k]) / d[k];
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (!(t0 <= t1)) open++;
    }
    return open / N;
  };
  const lights = { moon: { toward: [-1, 1, 0.2], color: [1, 1, 1], spread: 0.01 }, core: { at: [-30, 40, 0], r: 2, color: [1, 1, 1], fall: 2 }, sky: [1, 1, 1] };
  for (const [cell, off] of [[2, 0.1], [1, 0.02]]) {
    const block = mesh('block', box(lo, hi, 20), { albedo: [0.5, 0.5, 0.5], receive: false });
    const n = Math.round(100 / cell);
    const ground = mesh('ground', grid([-50 - off, 0, 20], [n * cell, 0, 0], [0, 0, -40], n, Math.round(40 / cell)), { albedo: [0.5, 0.5, 0.5] });
    const lit = (await bake({ meshes: [ground, block], ...lights }, { bounces: 1, samples: { core: 64, moon: 16, hemi: 1024 } })).ground;
    const P = ground.positions, row = (i) => Math.abs(P[i * 3] + off) < 1e-4 && Math.abs(P[i * 3 + 2]) < 10;
    const [m0] = range(lit.moon, row), [c0] = range(lit.core, row);
    let sum = 0, count = 0;
    for (let i = 0; i < P.length / 3; i++) if (row(i)) { sum += lit.open[i]; count++; }
    const want = truth(-off);
    check(`9 ground running on under a block, triangles ${cell}, vertices ${off} off its wall: the moon and the core seen whole`, m0 === 1 && c0 === 1, `least moon ${m0}, least core ${c0}`);
    check(`9 ground running on under a block, triangles ${cell}, vertices ${off} off its wall: open as the block leaves it, within 0.01`, Math.abs(sum / count - want) < 0.01, `${fmt(sum / count)} vs ${fmt(want)}`);
  }
  {
    const ground = mesh('ground', grid([-20.05, 0, 20], [40, 0, 0], [0, 0, -40], 20, 20), { albedo: [0.5, 0.5, 0.5] });
    const path = mesh('path', grid([0, 0.01, 20], [10, 0, 0], [0, 0, -40], 5, 20), { albedo: [0.5, 0.5, 0.5], receive: false });
    const lit = (await bake({ meshes: [ground, path], moon: { toward: [0, 1, 0], color: [1, 1, 1], spread: 0.01 }, core: { at: [-10, 30, 0], r: 1, color: [1, 1, 1], fall: 2 }, sky: [1, 1, 1] },
      { bounces: 1, samples: { core: 64, moon: 16, hemi: 256 } })).ground;
    const P = ground.positions, row = (i) => Math.abs(P[i * 3] + 0.05) < 1e-4 && Math.abs(P[i * 3 + 2]) < 15;
    const [m0] = range(lit.moon, row), [c0] = range(lit.core, row);
    check('9 ground with a path laid 0.01 over it, vertices 0.05 off its edge: the moon overhead and the core seen whole', m0 === 1 && c0 === 1, `least moon ${m0}, least core ${c0}`);
  }
  {
    const block = mesh('block', box([-10, -1.95, -10], [10, 30.05, 10], [10, 16, 10]), { albedo: [0.5, 0.5, 0.5] });
    const ground = mesh('ground', grid([-100, 0, 100], [200, 0, 0], [0, 0, -200], 67, 67), { albedo: [0.2, 0.2, 0.2], receive: false });
    const lit = (await bake({ meshes: [block, ground], moon: { toward: [0.6, 0.8, 0.1], color: [1, 1, 1], spread: 0.01 }, core: { at: [40, 30, 0], r: 2, color: [1, 1, 1], fall: 2 }, sky: [1, 1, 1] },
      { bounces: 1, samples: { core: 32, moon: 16, hemi: 1024 } })).block;
    const P = block.positions, N = block.normals;
    const row = (i) => N[i * 3] > 0.9 && Math.abs(P[i * 3 + 1] - 0.05) < 1e-4 && Math.abs(P[i * 3 + 2]) < 8;
    let count = 0;
    for (let i = 0; i < P.length / 3; i++) if (row(i)) count++;
    const [m0] = range(lit.moon, row), [c0] = range(lit.core, row), [o0, o1] = range(lit.open, row);
    check('9 a block sunk 1.95 in a ground sheet, the row of its lit wall 0.05 over the ground: the moon and the core seen whole', count >= 7 && m0 === 1 && c0 === 1, `${count} vertices, least moon ${m0}, least core ${c0}`);
    check('9 a block sunk 1.95 in a ground sheet, the same row: open is the half of the wall\'s hemisphere over the ground, within 0.01', o0 > 0.49 && o1 < 0.51, `from ${fmt(o0)} to ${fmt(o1)}`);
  }
}

// From every floor vertex on x = 0 the edge of a half plate over x < 0 runs straight over the middle of the core and
// of the moon, so each sees exactly half of either, whatever its triangles. Across those vertices the values must
// close on 0.5 as samples rise. When a vertex's triangles took turns at one sequence of samples, the low bit of its
// index gave each triangle one half of the disc, and a spread of about 0.02 stayed at any count.
async function halves() {
  for (const cell of [1, 2]) {
    const n = Math.round(40 / cell);
    const floor = mesh('floor', grid([-20, 0, 20], [40, 0, 0], [0, 0, -40], n, n));
    const plate = mesh('plate', grid([-100, 5, -100], [100, 0, 0], [0, 0, 200], 1, 1), { receive: false });
    const P = floor.positions, line = [];
    for (let i = 0; i < P.length / 3; i++) if (P[i * 3] === 0 && Math.abs(P[i * 3 + 2]) < 15) line.push(i);
    for (const light of ['core', 'moon']) {
      const scene = {
        meshes: [floor, plate], sky: [0, 0, 0],
        core: light === 'core' ? { at: [0, 10, 0], r: 0.5, color: [1, 1, 1], fall: 2 } : null,
        moon: light === 'moon' ? { toward: [0, 1, 0], color: [1, 1, 1], spread: 0.05 } : null,
      };
      const spread = {};
      let mean = 0;
      for (const N of [1024, 16384]) {
        const lit = (await bake(scene, { bounces: 0, samples: { core: N, moon: N, hemi: 1 } })).floor;
        const v = line.map((i) => lit[light][i]);
        mean = v.reduce((a, b) => a + b) / v.length;
        spread[N] = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
      }
      check(`10 half of the ${light} seen from ${line.length} vertices, triangles ${cell}: at 16384 samples the spread across them is under 0.002 and their mean within 0.002 of 0.5`,
        spread[16384] < 0.002 && Math.abs(mean - 0.5) < 0.002, `spread ${fmt(spread[16384])}, mean ${fmt(mean)}`);
      check(`10 half of the ${light}, triangles ${cell}: the spread at 16384 samples is under a quarter of that at 1024`,
        spread[16384] < spread[1024] / 4, `${fmt(spread[1024])} at 1024, ${fmt(spread[16384])} at 16384`);
    }
  }
}

async function emitter() {
  const h = 2, s = 2, M = 1, bias = 0.01;
  const floor = mesh('floor', grid([-10, 0, 10], [20, 0, 0], [0, 0, -20], 40, 40));
  const lamp = mesh('lamp', grid([-s, h, -s], [2 * s, 0, 0], [0, 0, 2 * s], 4, 4), { receive: false });
  lamp.emit = new Float32Array(lamp.positions.length).fill(M);
  const scene = { meshes: [floor, lamp], moon: null, core: null, sky: [0, 0, 0] };
  const lit = (await bake(scene, { samples: { core: 0, moon: 0, hemi: 1024 }, bounces: 1, bias })).floor;
  const c = h - bias;
  const G = (x, z) => (x / Math.hypot(c, x) * Math.atan(z / Math.hypot(c, x)) + z / Math.hypot(c, z) * Math.atan(x / Math.hypot(c, z))) / (2 * Math.PI);
  const F = (px, pz) => {
    const x0 = -s - px, x1 = s - px, z0 = -s - pz, z1 = s - pz;
    return G(x1, z1) - G(x0, z1) - G(x1, z0) + G(x0, z0);
  };
  const N = 1024;
  let worst = 0, at = '', drift = 0, weights = 0;
  for (let i = 0; i < lit.bounce.length / 3; i++) {
    const x = floor.positions[i * 3], z = floor.positions[i * 3 + 2];
    const want = M * F(x, z), got = lit.bounce[i * 3];
    const sigma = M * Math.sqrt(Math.max(want / M * (1 - want / M), 1 / N) / N);
    const e = Math.abs(got - want) / sigma;
    if (e > worst) { worst = e; at = `(${x}, ${z}) ${fmt(got)} vs ${fmt(want)}`; }
    if (want > 0.1) { drift += got - want; weights += want; }
  }
  const mid = (floor.positions.length / 3 - 1) / 2;
  check('5 glowing square over a floor: bounce matches its form factor at every floor vertex within 3 sigma of plain random sampling',
    worst < 3, `worst ${fmt(worst, 2)} sigma at ${at}; under its middle ${fmt(lit.bounce[mid * 3])} vs ${fmt(M * F(0, 0))}`);
  check('5 glowing square over a floor: no bias, the sum over the lit floor within 0.3% of the closed form', Math.abs(drift / weights) < 0.003, `${fmt(drift / weights * 100, 3)}%`);
}

async function threads() {
  const room = mesh('room', box([-50, -50, -50], [50, 50, 50], 12, true), { albedo: [0.4, 0.5, 0.6] });
  const block = mesh('block', weld(box([-10, -45, -10], [10, -20, 10], 6)), { albedo: [0.7, 0.6, 0.5] });
  block.emit = new Float32Array(block.positions.length).fill(0.05);
  const scene = { meshes: [room, block], moon: { toward: [0, 1, 0], color: [1, 1, 1], spread: 0.02 }, core: { at: [5, 10, 0], r: 3, color: [2, 1, 0.5], fall: 2 }, sky: [0.01, 0.01, 0.01] };
  const many = Math.max(2, os.availableParallelism() - 1);
  const one = await bake(scene, { threads: 1, bounces: 2 });
  const lots = await bake(scene, { threads: many, bounces: 2 });
  let same = true;
  for (const name of ['room', 'block']) for (const k of ['core', 'moon', 'open', 'bent', 'bounce']) {
    const a = Buffer.from(one[name][k].buffer), b = Buffer.from(lots[name][k].buffer);
    if (!a.equals(b)) same = false;
  }
  check(`6 the same scene on 1 thread and on ${many}: every number identical`, same);
}

function cave(rings, around) {
  const R = 600, N = (rings + 1) * (around + 1);
  const positions = new Float32Array(N * 3), normals = new Float32Array(N * 3);
  const waves = [];
  let s = 7;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  for (let i = 0; i < 24; i++) {
    let x = rnd() - 0.5, y = rnd() - 0.5, z = rnd() - 0.5; const l = Math.hypot(x, y, z);
    const f = 1.5 * 1.6 ** (i / 2);
    waves.push([x / l * f, y / l * f, z / l * f, rnd() * 6.28, 0.12 / f ** 0.9]);
  }
  for (let j = 0, v = 0; j <= rings; j++) {
    const th = Math.PI * j / rings;
    for (let i = 0; i <= around; i++, v++) {
      const ph = 2 * Math.PI * i / around;
      const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
      let d = 1;
      for (const [a, b, c, p, amp] of waves) d += amp * Math.sin(a * x + b * y + c * z + p);
      positions[v * 3] = x * R * d; positions[v * 3 + 1] = y * R * d * 0.7; positions[v * 3 + 2] = z * R * d;
    }
  }
  const indices = new Uint32Array(rings * around * 6);
  for (let j = 0, t = 0; j < rings; j++) for (let i = 0; i < around; i++) {
    const a = j * (around + 1) + i, b = a + 1, c = a + around + 1, d = c + 1;
    indices[t++] = a; indices[t++] = b; indices[t++] = d;
    indices[t++] = a; indices[t++] = d; indices[t++] = c;
  }
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { normals[k] += nx; normals[k + 1] += ny; normals[k + 2] += nz; }
  }
  let inward = 0;
  for (let v = 0; v < N; v++) inward += -(normals[v * 3] * positions[v * 3] + normals[v * 3 + 1] * positions[v * 3 + 1] + normals[v * 3 + 2] * positions[v * 3 + 2]);
  if (inward < 0) {
    for (let t = 0; t < indices.length; t += 3) { const x = indices[t + 1]; indices[t + 1] = indices[t + 2]; indices[t + 2] = x; }
    for (let i = 0; i < normals.length; i++) normals[i] = -normals[i];
  }
  for (let v = 0; v < N; v++) {
    let l = Math.hypot(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
    if (l === 0) {
      for (let k = 0; k < 3; k++) normals[v * 3 + k] = -positions[v * 3 + k];
      l = Math.hypot(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
    }
    normals[v * 3] /= l; normals[v * 3 + 1] /= l; normals[v * 3 + 2] /= l;
  }
  return { name: 'cave', positions, normals, indices, albedo: [0.45, 0.4, 0.35], receive: true };
}

async function timing() {
  const c = cave(550, 1100);
  const scene = { meshes: [c], moon: { toward: [0.2, 1, 0.3], color: [1, 1, 1], spread: 0.01 }, core: { at: [0, -40, 0], r: 40, color: [8, 4, 1], fall: 2 }, sky: [0, 0, 0] };
  const stats = {};
  let last = 0;
  const lit = await bake(scene, { stats, onProgress: (s) => { if (s - last >= 0.1 || s === 1) { last = s; process.stdout.write(`  ${Math.round(s * 100)}%`); } } });
  process.stdout.write('\n');
  console.log(`      ${stats.triangles} triangles, ${stats.vertices} vertices (${stats.receivers} receiving), ${stats.threads} threads`);
  console.log(`      bvh: ${stats.bvhNodes} nodes in ${fmt(stats.bvhSeconds, 2)} s`);
  console.log(`      rays: ${(stats.rays / 1e6).toFixed(1)} M in ${fmt(stats.traceSeconds, 1)} s, ${(stats.raysPerSecond / 1e6).toFixed(2)} M/s in all, ${(stats.raysPerSecondPerThread / 1e6).toFixed(2)} M/s per thread`);
  console.log(`      whole bake: ${fmt(stats.seconds, 1)} s`);
  let bad = 0;
  for (const k of ['core', 'moon', 'open', 'bent', 'bounce']) for (const x of lit.cave[k]) if (!Number.isFinite(x)) bad++;
  check('7 timing: a cave of a million triangles bakes in minutes, every number finite', stats.triangles >= 1e6 && stats.seconds < 600 && bad === 0, `${fmt(stats.seconds, 1)} s`);
}

await bvhCheck();
await openSky();
await moonEdge();
await enclosure();
await creases();
await acute();
await knife();
await emitter();
await feet();
await halves();
await threads();
await inputs();
if (!quick) await timing();
console.log(failures ? `${failures} FAILED` : 'ALL PASS');
process.exit(failures ? 1 : 0);
