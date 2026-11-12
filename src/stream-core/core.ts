import { lamp } from '../lamp/lamp';
import { GROUND, MAX_RATIO, program, type GL, type Program } from '../stream-ideas/gl';
import { CARD, TITLE, clear, seeded } from '../stream-ideas/route';
import { QUAD, SCENE_SHOW } from '../stream-ideas/shaders';
import { clock } from '../world/clock';
import { LAND, LANDING, ROUTE, SPLIT, STRIKE, at } from './route';
import * as S from './shaders';

const TAU = Math.PI * 2;
const STEP = 0.004; // between a strand's points along the route
const POINTS = Math.ceil(Math.max(...ROUTE.map((r) => r.len)) / STEP) + 2;
const SHARDS = 750; // to each side
const SPARKS = 900;
const FORKS = 4; // at each leading end
const FORK_STEPS = 5;
const STRAYS = 3; // the arc's own side branches, to each side
const STREAK_FLOATS = 4;
const FLOW = 0.055; // how much of the route a shard covers in a second
const WARM_STEPS = 110; // for a frozen clock: run the sparks this far, then hold, so a still is always the same

const hash = (a: number, b: number, c: number): number => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x165667b1, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return ((h >>> 0) / 4294967296) * 2 - 1;
};

// Random along its length and changing over time: `rate` new shapes a second, each eased into the next.
const noise = (pos: number, seed: number, rate: number, t: number): number => {
  const j = Math.floor(pos), f = pos - j, tk = Math.floor(t * rate), tf = t * rate - tk, e = tf * tf * (3 - 2 * tf);
  const a = hash(j, seed, tk) * (1 - e) + hash(j, seed, tk + 1) * e;
  const b = hash(j + 1, seed, tk) * (1 - e) + hash(j + 1, seed, tk + 1) * e;
  return a + (b - a) * f;
};

interface Strand {
  route: number;
  level: (d: number, t: number) => number; // how bright its line is
  width: (d: number, t: number) => number;
  glow: number; // how bright its halo is
  halo: number; // and how wide
  shift: (d: number, t: number) => number;
}

const parted = (d: number) => Math.max(0, Math.min(1, (d - SPLIT) / 0.08));
const swell = (d: number, t: number) => 1 + 0.35 * Math.sin(TAU * (d / 0.16 - 0.3 * t)) + 0.18 * Math.sin(TAU * (d / 0.07 - 0.55 * t) + 1);
const haze = (route: number, glow: number): Strand => ({ route, level: () => 0, width: () => 0.001, glow, halo: 0.036, shift: () => 0 });

// A: one steady line of light that swells and thins, with three finer lines winding round it.
const WAVE: Strand[] = ROUTE.flatMap((_, r) => [
  haze(r, 0.2),
  { route: r, level: () => 1, width: (d, t) => 0.0025 * swell(d, t), glow: 0.4, halo: 0.011, shift: () => 0 },
  // Each winds in and out of sight, so they read as light and not as wire.
  ...[{ a: 0.0105, l: 0.15, v: 0.3, p: 0, f: 0.37 }, { a: 0.0125, l: 0.23, v: 0.2, p: 2.6, f: 0.29 }, { a: 0.0075, l: 0.09, v: 0.42, p: 4.4, f: 0.21 }].map((w): Strand => ({
    route: r, level: (d, t) => 0.12 + 0.68 * (0.5 + 0.5 * Math.sin(TAU * (d / w.f - 0.16 * t) + w.p * 1.7)) ** 1.5, width: () => 0.0012, glow: 0.2, halo: 0.0045,
    shift: (d, t) => w.a * Math.sin(TAU * (d / w.l - w.v * t) + w.p + r * 2.1 * parted(d)),
  })),
]);

// B: two jagged lines to each side, never still.
const ARC: Strand[] = ROUTE.flatMap((_, r) => [
  haze(r, 0.16),
  ...[0, 1].map((k): Strand => {
    const seed = 10 + r * 20 + k * 7;
    return {
      route: r, level: (_, t) => 0.86 + 0.14 * noise(0, seed + 9, 11, t), width: () => 0.0014, glow: 0.36, halo: 0.006,
      shift: (d, t) => 0.0016 * noise(d / 0.005, seed, 9, t) + 0.0045 * noise(d / 0.016, seed + 1, 5, t)
        + 0.008 * noise(d / 0.05, seed + 2, 2.2, t) + 0.008 * noise(d / 0.17, seed + 3, 0.7, t),
    };
  }),
]);

const STRAND_FLOATS = 7;
const SHARD_FLOATS = 11;
const tmp = new Float32Array(4);
const px = new Float32Array(POINTS), py = new Float32Array(POINTS), pw = new Float32Array(POINTS), ph = new Float32Array(POINTS), pl = new Float32Array(POINTS);

function fill(out: Float32Array, base: number, s: Strand, reach: number, t: number): void {
  const r = ROUTE[s.route], head = reach * r.len, ext = s.halo * S.REACH;
  for (let i = 0; i < POINTS; i++) {
    const d = Math.min(i * STEP, head), lead = head - d;
    at(r, d, tmp);
    const sh = s.shift(d, t) * Math.min(1, lead / 0.03);
    [px[i], py[i]] = clear(tmp[0] + tmp[2] * sh, tmp[1] + tmp[3] * sh);
    pw[i] = s.width(d, t);
    pl[i] = s.level(d, t);
    ph[i] = s.glow * Math.min(1, lead / 0.05);
  }
  let nx = 1, ny = 0;
  for (let i = 0; i < POINTS; i++) {
    const a = Math.max(0, i - 1), b = Math.min(POINTS - 1, i + 1);
    const tx = px[b] - px[a], ty = py[b] - py[a], len = Math.hypot(tx, ty);
    if (len > 1e-7) { nx = ty / len; ny = -tx / len; }
    for (let k = -1; k <= 1; k++) {
      const o = base + (i * 3 + k + 1) * STRAND_FLOATS;
      out[o] = px[i] + nx * ext * k; out[o + 1] = py[i] + ny * ext * k; out[o + 2] = ph[i];
      out[o + 3] = ext * k; out[o + 4] = pw[i]; out[o + 5] = pl[i]; out[o + 6] = s.halo;
    }
  }
}

// Two ways to draw the core of the stream, one to a panel, on one WebGL context. Everything else is shared: the
// shards riding round it, the sparks, the leading end.
export function mountCore(canvas: HTMLCanvasElement, panels: HTMLElement[], reach: () => number): () => void {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false }) as GL | null;
  if (!gl) return () => undefined;
  const make = (vs: string, fs: string, attribs?: string[]) => program(gl, vs, fs, attribs);

  const scene = make(QUAD, SCENE_SHOW);
  const show = make(QUAD, S.LIGHT_SHOW);
  const strand = make(S.STRAND_VERT, S.STRAND_FRAG, ['aPos', 'aStrand']);
  const streak = make(S.STREAK_VERT, S.STREAK_FRAG, ['aPos', 'aHot']);
  const shardNames = ['aCorner', 'aShard', 'aTurn', 'aCore'];
  const shard = make(S.SHARD_VERT, S.SHARD_FRAG, shardNames);

  const quad = gl.createVertexArray()!;
  gl.bindVertexArray(quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // ---- the cores
  const cores = [WAVE, ARC].map((strands) => {
    const data = new Float32Array(strands.length * POINTS * 3 * STRAND_FLOATS);
    const index = new Uint16Array(strands.length * (POINTS - 1) * 12);
    let n = 0;
    strands.forEach((_, s) => {
      for (let i = 0; i < POINTS - 1; i++) {
        const a = (s * POINTS + i) * 3, b = a + 3;
        index.set([a, a + 1, b, b, a + 1, b + 1, a + 1, a + 2, b + 1, b + 1, a + 2, b + 2], n);
        n += 12;
      }
    });
    const array = gl.createVertexArray()!;
    gl.bindVertexArray(array);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRAND_FLOATS * 4, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, STRAND_FLOATS * 4, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    return { strands, data, array, buffer, count: index.length };
  });

  // ---- sparks and forks
  const streakData = new Float32Array((SPARKS + ROUTE.length * (FORKS + STRAYS) * FORK_STEPS) * 6 * STREAK_FLOATS);
  const streakArray = gl.createVertexArray()!;
  gl.bindVertexArray(streakArray);
  const streakBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, streakData.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STREAK_FLOATS * 4, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STREAK_FLOATS * 4, 8);

  const sx = new Float32Array(SPARKS), sy = new Float32Array(SPARKS), svx = new Float32Array(SPARKS), svy = new Float32Array(SPARKS);
  const sage = new Float32Array(SPARKS), slife = new Float32Array(SPARKS);
  let rs = seeded(41), next = 0;
  const carry = [0, 0, 0, 0, 0], was = [0, 0];
  const emit = (x: number, y: number, dx: number, dy: number, fan: number, lo: number, hi: number) => {
    const a = Math.atan2(dy, dx) + (rs() + rs() - 1) * fan, v = lo + (hi - lo) * rs() * rs();
    sx[next] = x; sy[next] = y; svx[next] = Math.cos(a) * v; svy[next] = Math.sin(a) * v; sage[next] = 0; slife[next] = 0.25 + 0.95 * rs() * rs();
    next = (next + 1) % SPARKS;
  };
  const strike = () => emit(STRIKE.x, STRIKE.y, 0, 1, 1.25, 0.06, 0.3);
  const landing = () => emit(LANDING.x, LANDING.y, 0.35, 1, 1.1, 0.06, 0.3);
  const sparkStep = (dt: number, at_: number) => {
    ROUTE.forEach((r, b) => {
      const head = at_ * r.len, pace = Math.min(Math.abs(head - was[b]) / dt, 0.6);
      if (was[b] < SPLIT && head >= SPLIT && b === 0) for (let i = 0; i < 45; i++) strike();
      if (was[b] < LAND && head >= LAND && b === 0) for (let i = 0; i < 45; i++) landing();
      was[b] = head;
      at(r, head, tmp);
      carry[b] += (80 + 2200 * pace) * dt * (head < SPLIT ? 0.5 : 1);
      for (; carry[b] >= 1; carry[b]--) emit(tmp[0], tmp[1], -tmp[3], tmp[2], 1.9, 0.04, 0.34);
    });
    for (carry[4] += 26 * dt; carry[4] >= 1; carry[4]--) {
      const r = ROUTE[rs() < 0.5 ? 0 : 1];
      at(r, rs() * at_ * r.len, tmp);
      const side = rs() < 0.5 ? -1 : 1;
      emit(tmp[0], tmp[1], tmp[2] * side, tmp[3] * side, 1.2, 0.03, 0.16);
    }
    if (was[0] >= SPLIT) for (carry[2] += 16 * dt; carry[2] >= 1; carry[2]--) strike();
    if (was[0] >= LAND) for (carry[3] += 18 * dt; carry[3] >= 1; carry[3]--) landing();
    const drag = Math.exp(-1.4 * dt);
    for (let i = 0; i < SPARKS; i++) {
      if (slife[i] <= 0) continue;
      sage[i] += dt;
      if (sage[i] >= slife[i]) { slife[i] = 0; continue; }
      svy[i] = (svy[i] - 0.55 * dt) * drag;
      svx[i] *= drag;
      sx[i] += svx[i] * dt;
      sy[i] += svy[i] * dt;
      for (const box of [TITLE, CARD]) {
        const top = box.y + box.hh;
        if (Math.abs(sx[i] - box.x) > box.hw || sy[i] > top || sy[i] < box.y - box.hh) continue;
        if (svy[i] < 0 && sy[i] - svy[i] * dt > top - 0.004) { sy[i] = top; svy[i] *= -0.35; svx[i] *= 0.7; } else slife[i] = 0;
      }
    }
  };
  const warm = (at_: number) => {
    rs = seeded(41);
    next = 0;
    slife.fill(0);
    carry.fill(0);
    ROUTE.forEach((r, b) => { was[b] = at_ * r.len; });
    for (let i = 0; i < WARM_STEPS; i++) sparkStep(1 / 60, at_);
  };

  // ---- shards
  const sr = seeded(23);
  const shards = Array.from({ length: SHARDS * ROUTE.length }, (_, i) => {
    const glass = sr() < 0.42;
    return {
      route: i < SHARDS ? 0 : 1, at: sr(), pace: 0.75 + 0.5 * sr(), r: 0.0065 + 0.036 * sr() ** 1.6, ph: sr() * TAU,
      orbit: (sr() < 0.5 ? -1 : 1) * (0.5 + 1.4 * sr()), twist: (sr() - 0.5) * 60, size: glass ? 0.0022 + 0.0075 * sr() ** 3 : 0.0018 + 0.0048 * sr() ** 2.5,
      ang: sr() * TAU, spin: (sr() - 0.5) * 2.4, tilt: sr() * TAU, tumble: 0.6 + 2.2 * sr(), own: sr(), glass: glass ? 1 : 0, spare: sr() < 0.5,
    };
  });
  const shardData = new Float32Array(shards.length * SHARD_FLOATS);
  const shardArray = gl.createVertexArray()!;
  gl.bindVertexArray(shardArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const shardBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, shardBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, shardData.byteLength, gl.DYNAMIC_DRAW);
  for (let i = 1; i <= 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribDivisor(i, 1); }
  // Shards behind the core are kept at the start of the buffer and those in front at its end, so each lot can be drawn alone.
  const drawShards = (first: number, count: number) => {
    if (count <= 0) return;
    gl.bindVertexArray(shardArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, shardBuffer);
    const stride = SHARD_FLOATS * 4, from = first * stride;
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, from);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, from + 16);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, from + 32);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  };

  // ---- the light, drawn off screen before it is given color
  const lit = { tex: gl.createTexture()!, fbo: gl.createFramebuffer()!, w: 0, h: 0 };
  gl.bindTexture(gl.TEXTURE_2D, lit.tex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.bindFramebuffer(gl.FRAMEBUFFER, lit.fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lit.tex, 0);

  // A finger or a pen holds the light where it last touched. A mouse hands it back to the lamp.
  let held: { x: number; y: number } | null = null;
  const point = (e: PointerEvent) => { held = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; };
  const host = canvas.parentElement ?? canvas;
  host.addEventListener('pointerdown', point);
  host.addEventListener('pointermove', point);

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glow = new Float32Array(16);
  let run = -1, warmedAt = -1;

  const off = clock.onFrame((t, dt) => {
    const box = canvas.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight || box.width < 2 || panels.length < cores.length) return;
    const ratio = Math.min(devicePixelRatio || 1, MAX_RATIO);
    const w = Math.round(box.width * ratio), h = Math.round(box.height * ratio);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const fixed = clock.isFrozen() || still;
    const turn = still ? 2 : t;
    const want = Math.max(0.02, Math.min(1, reach()));
    // The leading end follows the slider smoothly and never jumps.
    run = fixed || run < 0 ? want : run + (want - run) * (1 - Math.exp(-dt * 9));

    if (fixed) {
      if (warmedAt !== run) { warm(run); warmedAt = run; }
    } else if (dt > 0) {
      if (warmedAt < 0) { warm(run); warmedAt = run; }
      sparkStep(Math.min(dt, 1 / 30), run);
    }

    // Streaks: every live spark, then the forks at each leading end, redrawn twelve times a second.
    let sn = 0;
    const corner = (x: number, y: number, hot: number, side: number) => { streakData[sn++] = x; streakData[sn++] = y; streakData[sn++] = hot; streakData[sn++] = side; };
    const put = (x0: number, y0: number, h0: number, x1: number, y1: number, h1: number, wide: number) => {
      const dx = x1 - x0, dy = y1 - y0, k = wide / (Math.hypot(dx, dy) || 1), ox = -dy * k, oy = dx * k;
      corner(x0 - ox, y0 - oy, h0, -1); corner(x0 + ox, y0 + oy, h0, 1); corner(x1 - ox, y1 - oy, h1, -1);
      corner(x1 - ox, y1 - oy, h1, -1); corner(x0 + ox, y0 + oy, h0, 1); corner(x1 + ox, y1 + oy, h1, 1);
    };
    for (let i = 0; i < SPARKS; i++) {
      if (slife[i] <= 0) continue;
      const hot = 1 - sage[i] / slife[i];
      put(sx[i], sy[i], hot, sx[i] - svx[i] * 0.06, sy[i] - svy[i] * 0.06, hot * 0.1, 0.0016);
    }
    const fork = (x: number, y: number, along: number, len: number, seed: number, tick: number) => {
      for (let j = 0; j < FORK_STEPS; j++) {
        const a = along + hash(j, seed, tick) * 0.9, x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
        put(x, y, 1 - (j / FORK_STEPS) * 0.75, x1, y1, 1 - ((j + 1) / FORK_STEPS) * 0.75, 0.0017);
        x = x1; y = y1;
      }
    };
    const tick = Math.floor(turn * 12);
    ROUTE.forEach((r, b) => {
      const head = run * r.len;
      at(r, head, tmp);
      glow.set([tmp[0], tmp[1], 0.0105 + 0.002 * noise(0, 60 + b, 10, turn), 1], b * 4);
      if (b === 1 && head < SPLIT) return;
      const along = Math.atan2(tmp[2], -tmp[3]);
      for (let k = 0; k < FORKS; k++) fork(tmp[0], tmp[1], along + hash(k, 70 + b, tick) * 1.7, (0.016 + 0.04 * Math.abs(hash(k, 80 + b, tick))) / FORK_STEPS, 100 + b * 40 + k, tick);
    });
    const shared = sn;
    // The arc alone throws short branches off its sides, here and there along its length.
    const slow = Math.floor(turn * 7);
    ROUTE.forEach((r, b) => {
      for (let k = 0; k < STRAYS; k++) {
        const where = (0.5 + 0.5 * hash(k, 200 + b, slow)) * run * r.len;
        if (b === 1 && where < SPLIT) continue;
        at(r, where, tmp);
        const side = hash(k, 210 + b, slow) < 0 ? -1 : 1;
        fork(tmp[0], tmp[1], Math.atan2(tmp[3] * side, tmp[2] * side) + hash(k, 220 + b, slow) * 0.8, (0.012 + 0.022 * Math.abs(hash(k, 230 + b, slow))) / FORK_STEPS, 300 + b * 40 + k, slow);
      }
    });
    glow.set([STRIKE.x, STRIKE.y, 0.011, run * ROUTE[0].len >= SPLIT ? 0.5 : 0], 8);
    glow.set([LANDING.x, LANDING.y, 0.011, run * ROUTE[0].len >= LAND ? 0.5 : 0], 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, streakData, 0, sn);

    // Shards: each rides down the route, circling the core as it goes, and is thrown wide as it reaches the leading end.
    let back = 0, front = 0;
    for (const f of shards) {
      const r = ROUTE[f.route], head = run * r.len, d = ((f.at + turn * FLOW * f.pace) % 1) * r.len, lead = head - d;
      if (lead <= 0) continue;
      const grown = Math.min(1, lead / 0.01) * (f.spare ? Math.max(0, Math.min(1, (d - SPLIT) / 0.03)) : 1);
      if (grown <= 0) continue;
      at(r, d, tmp);
      const cx = tmp[0], cy = tmp[1], round = f.ph + turn * f.orbit + d * f.twist, far = f.r * (1 + 2.5 * Math.exp(-lead / 0.025));
      const depth = far * Math.cos(round);
      const [x, y] = clear(cx + tmp[2] * far * Math.sin(round), cy + tmp[3] * far * Math.sin(round));
      const o = (depth < 0 ? back++ : shards.length - ++front) * SHARD_FLOATS;
      shardData[o] = x; shardData[o + 1] = y; shardData[o + 2] = f.size * grown; shardData[o + 3] = f.ang + turn * f.spin;
      shardData[o + 4] = f.tilt + turn * f.tumble; shardData[o + 5] = f.own; shardData[o + 6] = f.glass; shardData[o + 7] = 0;
      shardData[o + 8] = cx - x; shardData[o + 9] = cy - y; shardData[o + 10] = -depth;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, shardBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, shardData);

    const L = lamp.get();
    const light = held ?? { x: L.px, y: L.py };
    const frames = panels.slice(0, cores.length).map((panel) => {
      const r = panel.getBoundingClientRect();
      return {
        x: Math.round((r.left - box.left) * ratio), y: Math.round((box.bottom - r.bottom) * ratio), w: Math.round(r.width * ratio), h: Math.round(r.height * ratio),
        lx: (light.x - r.left - r.width / 2) / r.height, ly: -(light.y - r.top - r.height / 2) / r.height,
      };
    });
    const lw = Math.max(...frames.map((f) => f.w)), lh = Math.max(...frames.map((f) => f.h));
    if (lit.w !== lw || lit.h !== lh) {
      gl.bindTexture(gl.TEXTURE_2D, lit.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, lw, lh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      lit.w = lw; lit.h = lh;
    }
    const onPanel = (prog: Program, f: (typeof frames)[number]) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(prog.p);
      gl.enable(gl.SCISSOR_TEST);
      gl.viewport(f.x, f.y, f.w, f.h);
      gl.scissor(f.x, f.y, f.w, f.h);
      gl.uniform2f(prog.u('uRes'), f.w, f.h);
      gl.uniform2f(prog.u('uOrigin'), f.x, f.y);
      gl.uniform2f(prog.u('uLight'), f.lx, f.ly);
    };

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, w, h);
    gl.clearColor(GROUND[0], GROUND[1], GROUND[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    cores.forEach((core, i) => {
      const f = frames[i];
      core.strands.forEach((s, k) => fill(core.data, k * POINTS * 3 * STRAND_FLOATS, s, run, turn));

      // The light: the core's strands, the sparks and forks, and what the glass throws, each kept where it is brightest.
      gl.bindFramebuffer(gl.FRAMEBUFFER, lit.fbo);
      gl.disable(gl.SCISSOR_TEST);
      gl.viewport(0, 0, lit.w, lit.h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.viewport(0, 0, f.w, f.h);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.MAX);
      gl.useProgram(strand.p);
      gl.bindVertexArray(core.array);
      gl.bindBuffer(gl.ARRAY_BUFFER, core.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, core.data);
      gl.drawElements(gl.TRIANGLES, core.count, gl.UNSIGNED_SHORT, 0);
      gl.useProgram(streak.p);
      gl.bindVertexArray(streakArray);
      gl.drawArrays(gl.TRIANGLES, 0, (core.strands === ARC ? sn : shared) / STREAK_FLOATS);
      gl.blendEquation(gl.FUNC_ADD);
      gl.disable(gl.BLEND);

      onPanel(scene, f);
      gl.bindVertexArray(quad);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      onPanel(shard, f);
      drawShards(0, back);

      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
      onPanel(show, f);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, lit.tex);
      gl.uniform1i(show.u('uLit'), 0);
      gl.uniform2f(show.u('uScale'), f.w / lit.w, f.h / lit.h);
      gl.uniform4fv(show.u('uGlow'), glow);
      gl.bindVertexArray(quad);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      onPanel(shard, f);
      drawShards(shards.length - front, front);
      gl.disable(gl.BLEND);
    });
  });

  // The context is left alive: React mounts twice in development, and a canvas whose context was lost hands the
  // lost one back.
  return () => {
    off();
    host.removeEventListener('pointerdown', point);
    host.removeEventListener('pointermove', point);
  };
}
