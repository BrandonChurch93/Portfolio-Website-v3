import { registry, stats } from '../hooks/registry';
import { lamp } from '../lamp/lamp';
import { signedDistance } from '../metal/edt';
import { clock } from '../world/clock';
import { tiers } from '../world/tier';
import { STREAM, STREAM_BUDGET, STREAM_STEP, unitFor, type StreamBudget } from './config';
import { hash, seeded } from './rand';
import { CORE_FLOATS, INSTANCE_FLOATS, KINDS, LAYERS, STREAK_FLOATS, StreamRenderer, type CardShape, type Frame, type TitleField } from './renderer';
import { at, buildRoute, type Box, type Route } from './route';
import { CORE_HALF } from './shaders';
import { buildShards, facetKind, FIRST_KINDS, type Look } from './shards';
import { FORK_FLOATS, LOOSE_FLOATS, SPARK_FLOATS, StreamSim } from './sim';

// Puts the stream on a page. It reads where the title and the card are, plans the route round them, and each frame
// places every shard, steps what flies, and draws. The canvas rides with the page, a little taller than the screen,
// so what it draws stays locked to the page however fast the page is scrolled.

export interface StreamHandle {
  // Swap between the facets and the first round's shards, where it stands.
  setLook(look: Look): void;
  dispose(): void;
}

interface Options {
  title: HTMLElement;
  card: HTMLElement;
  // Open with the frame held: nothing moves but the cursor's light.
  hold?: boolean;
  look?: Look;
}

const S = STREAM;
const HOLD_TIME = 20;
const STILL_TIME = 20;
const TAU = Math.PI * 2;
const tmp = new Float32Array(4);

interface Riders {
  n: number;
  branch: Uint8Array;
  spare: Uint8Array;
  clear: Uint8Array;
  kind: Uint8Array;
  // at, pace, orbit radius, phase, sway rate, sway phase, size, spin rate, spin phase, then its spin axis, its starting turn, its own number, and a second number of its own
  f: Float32Array;
}
const RIDER = 18;

function makeRiders(route: Route, budget: StreamBudget, look: Look): Riders {
  const r = seeded(S.seed * 131 + 5), u = route.unit, K = S.shards, sizes = S.sizes[look];
  const counts = route.branches.map((b) => Math.round((budget.per100 * b.len) / (100 * u)));
  const n = counts[0] + counts[1];
  const out: Riders = { n, branch: new Uint8Array(n), spare: new Uint8Array(n), clear: new Uint8Array(n), kind: new Uint8Array(n), f: new Float32Array(n * RIDER) };
  for (let i = 0; i < n; i++) {
    const o = i * RIDER, clear = r() < K.clear;
    out.branch[i] = i < counts[0] ? 0 : 1;
    out.spare[i] = r() < 0.5 ? 1 : 0;
    out.clear[i] = clear ? 1 : 0;
    const pick = r();
    // Many small, a few large enough to show every face.
    const big = r() ** 3.4;
    out.kind[i] = look === 'first' ? Math.floor(pick * FIRST_KINDS) : facetKind(big, pick);
    const q = [r() - 0.5, r() - 0.5, r() - 0.5, r() - 0.5], ql = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    const a = [r() - 0.5, r() - 0.5, r() - 0.5], al = Math.hypot(a[0], a[1], a[2]) || 1;
    out.f.set([
      // Each belongs to one of three bands that wind round the core like the strands of a rope, so the sheath has
      // an order to it and never reads as a cloud of loose parts.
      r(), 0.7 + 0.65 * r(), (K.near + (K.far - K.near) * r() ** 2.1) * u, (Math.floor(r() * 3) * TAU) / 3 + (r() + r() - 1) * 0.55, 0.3 + 0.7 * r(), r() * TAU,
      (sizes[0] + (sizes[1] - sizes[0]) * big) * u * (clear && look === 'first' ? 1.12 : 1), (0.25 + 0.95 * r()) * (r() < 0.5 ? -1 : 1), r() * TAU,
      a[0] / al, a[1] / al, a[2] / al, q[0] / ql, q[1] / ql, q[2] / ql, q[3] / ql, r(), hash(i, 77, S.seed),
    ], o);
  }
  return out;
}

// The title's letters as a field of distances, drawn the way the page draws them, so the stream can light any heading.
function titleField(el: HTMLElement, host: DOMRect, dpr: number): { field: TitleField; ink: Box } | null {
  const cs = getComputedStyle(el), box = el.getBoundingClientRect();
  const pad = 30;
  const w = Math.ceil((box.width + pad * 2) * dpr), h = Math.ceil((box.height + pad * 2) * dpr);
  if (w < 4 || h < 4 || w * h > 6e6) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  const size = parseFloat(cs.fontSize);
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${size * dpr}px ${cs.fontFamily}`;
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  let text = el.textContent ?? '';
  if (cs.textTransform === 'uppercase') text = text.toUpperCase();
  const m = g.measureText(text);
  const line = (cs.lineHeight === 'normal' ? size * 1.2 : parseFloat(cs.lineHeight)) * dpr;
  const rise = m.fontBoundingBoxAscent, drop = m.fontBoundingBoxDescent;
  const base = (pad + parseFloat(cs.paddingTop)) * dpr + (line - (rise + drop)) / 2 + rise;
  const gap = (parseFloat(cs.letterSpacing) || 0) * dpr;
  let x = (pad + parseFloat(cs.paddingLeft)) * dpr;
  for (const ch of text) { g.fillText(ch, x, base); x += g.measureText(ch).width + gap; }
  const px = g.getImageData(0, 0, w, h).data;
  const cover = new Uint8Array(w * h);
  let l = w, t = h, r = 0, b = 0;
  for (let i = 0; i < w * h; i++) {
    const v = px[i * 4 + 3];
    cover[i] = v;
    if (v > 24) { const cx = i % w, cy = (i / w) | 0; if (cx < l) l = cx; if (cx > r) r = cx; if (cy < t) t = cy; if (cy > b) b = cy; }
  }
  if (r <= l) return null;
  const dist = signedDistance(cover, w, h, 255);
  const fine = 6, out = 150, inn = 10;
  const data = new Uint8Array(w * h * 2);
  for (let i = 0; i < w * h; i++) {
    data[i * 2] = Math.max(0, Math.min(255, Math.round((dist[i] / fine) * 127.5 + 127.5)));
    data[i * 2 + 1] = Math.max(0, Math.min(255, Math.round(((Math.max(-inn, Math.min(out, dist[i])) + inn) / (out + inn)) * 255)));
  }
  const ox = box.left - host.left - pad, oy = box.top - host.top - pad;
  return {
    field: { data, w, h, rect: [ox, oy, w / dpr, h / dpr], range: [fine, out, inn] },
    ink: { l: ox + l / dpr, t: oy + t / dpr, r: ox + (r + 1) / dpr, b: oy + (b + 1) / dpr },
  };
}

export function mountStream(host: HTMLElement, opts: Options): StreamHandle {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:absolute;left:0;top:0;width:100%;height:calc(100vh + ${S.margin * 2}px);height:calc(100lvh + ${S.margin * 2}px);pointer-events:none;will-change:transform;z-index:3`;
  host.appendChild(canvas);
  const meshes = buildShards(S.seed);
  let renderer: StreamRenderer | null = new StreamRenderer(canvas, meshes);
  let look: Look = opts.look ?? 'facets';
  let route: Route | null = null;
  let sim: StreamSim | null = null;
  let riders: Riders | null = null;
  let budget: StreamBudget = STREAM_BUDGET.high;
  let built = '';
  let still = false;
  let unit = 1, presence = 1;
  let hostTop = 0, hostH = 1, cssW = 1, cssH = 1;
  let core = new Float32Array(0), streaks = new Float32Array(0), shards = new Float32Array(0), scratch = new Float32Array(0);
  let keys = new Uint8Array(0);
  const lots = new Int32Array(LAYERS * KINDS * 2);
  let lastLine = 0, settled = '', spent = 0;
  let heldLine: number | null = null;
  let touch: { x: number; y: number } | null = null;
  let script: { y0: number; y1: number; t0: number; t1: number } | null = null;
  let disposed = false;

  const anchorLine = (top: number) => top + S.anchor * clock.view.h;

  const build = () => {
    if (!renderer || !renderer.ok || disposed) return;
    const tier = tiers.get();
    clock.readView();
    const hr = host.getBoundingClientRect();
    const w = Math.max(1, hr.width), h = Math.max(1, canvas.getBoundingClientRect().height);
    const key = `${tier}:${Math.round(w)}:${Math.round(h)}:${Math.round(hr.height)}`;
    if (key === built) return;
    built = key;
    still = tier === 'static';
    budget = STREAM_BUDGET[tier === 'static' ? 'mid' : tier];
    cssW = w;
    cssH = Math.min(h, hr.height);
    hostH = hr.height;
    hostTop = hr.top + scrollY;
    unit = unitFor(innerWidth, parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
    presence = Math.max(0, Math.min(1, (innerWidth - S.presence[0]) / (S.presence[1] - S.presence[0])));
    const want = Math.min(devicePixelRatio || 1, budget.pixelRatio);
    const dpr = Math.min(want, Math.sqrt(budget.pixels / (cssW * cssH)));
    const made = titleField(opts.title, hr, dpr);
    const cr = opts.card.getBoundingClientRect();
    const cardBox: Box = { l: cr.left - hr.left, t: cr.top - hr.top, r: cr.right - hr.left, b: cr.bottom - hr.top };
    const ink: Box = made ? made.ink : (() => { const b = opts.title.getBoundingClientRect(); return { l: b.left - hr.left, t: b.top - hr.top, r: b.right - hr.left, b: b.bottom - hr.top }; })();
    route = buildRoute(ink, cardBox, w, hostH + 260 * unit, unit);
    const cardShape: CardShape = { x: (cardBox.l + cardBox.r) / 2, y: (cardBox.t + cardBox.b) / 2, hw: (cardBox.r - cardBox.l) / 2, hh: (cardBox.b - cardBox.t) / 2, r: parseFloat(getComputedStyle(opts.card).borderTopLeftRadius) || 0 };
    renderer.configure(budget);
    renderer.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), dpr);
    renderer.setRelief(made ? made.field : null, cardShape);
    populate();
    const points = route.branches[0].n + route.branches[1].n + 8;
    core = new Float32Array(points * 2 * CORE_FLOATS);
    streaks = new Float32Array((budget.sparks * 12 + 40 * 60 * 6 + 220 * 12 + 120) * STREAK_FLOATS);
    host.dataset.stream = made ? 'on' : 'off';
    settled = '';
    if (opts.hold) {
      // Held about two thirds of the way down the route: the left side has landed and run the card's top, the right
      // side is level with it.
      heldLine = cardBox.t - (S.route.above - 7) * unit;
      const y = Math.max(0, Math.round(hostTop + heldLine - S.heldAt * innerHeight));
      if (!clock.isFrozen()) clock.freeze(HOLD_TIME);
      scrollTo({ top: y, left: 0, behavior: 'instant' });
    }
    lastLine = heldLine ?? anchorLine(scrollY - hostTop);
    if (!still) sim?.settle(lastLine, clock.now());
  };

  // The shards for the look in use: those that ride, and the simulation that throws the loose ones.
  const populate = () => {
    if (!route) return;
    riders = makeRiders(route, budget, look);
    sim = new StreamSim(route, budget, S.seed, S.sizes[look]);
    const most = riders.n + budget.loose;
    shards = new Float32Array(most * INSTANCE_FLOATS);
    scratch = new Float32Array(most * INSTANCE_FLOATS);
    keys = new Uint8Array(most);
    settled = '';
  };

  // ---- the core: a ribbon down each side, as far as its leading end
  const fillCore = (top: number, bottom: number, runs: [number, number, number, number]): void => {
    if (!route || !sim) return;
    let n = 0;
    for (let b = 0; b < 2; b++) {
      const br = route.branches[b], head = sim.head[b];
      const first = n;
      const from = b === 1 ? Math.max(0, route.split - 6 * unit) : 0;
      if (head > from + 1) {
        const i0 = Math.floor(from / br.step), i1 = Math.floor(head / br.step);
        const push = (x: number, y: number, tx: number, ty: number, s: number) => {
          const w = CORE_HALF * unit;
          core[n++] = x - ty * w; core[n++] = y + tx * w; core[n++] = -CORE_HALF; core[n++] = s / unit; core[n++] = (head - s) / unit;
          core[n++] = x + ty * w; core[n++] = y - tx * w; core[n++] = CORE_HALF; core[n++] = s / unit; core[n++] = (head - s) / unit;
        };
        for (let i = i0; i <= i1; i++) {
          if (br.y[i] < top - 80 && br.floor[Math.min(br.n - 1, i + 40)] < top - 80) continue;
          if (br.y[i] > bottom + 80) continue;
          push(br.x[i], br.y[i], br.tx[i], br.ty[i], i * br.step);
        }
        at(br, head, tmp);
        push(tmp[0], tmp[1], tmp[2], tmp[3], head);
      }
      runs[b * 2] = first / CORE_FLOATS;
      runs[b * 2 + 1] = (n - first) / CORE_FLOATS;
    }
  };

  // ---- sparks, forks and the hot point at each leading end
  const fillStreaks = (t: number): number => {
    if (!route || !sim) return 0;
    let n = 0;
    const u = unit, out = streaks;
    const vert = (x: number, y: number, across: number, amount: number, along: number) => { if (n + 5 > out.length) return; out[n++] = x; out[n++] = y; out[n++] = across; out[n++] = amount; out[n++] = along; };
    const streak = (x0: number, y0: number, a0: number, w0: number, x1: number, y1: number, a1: number, w1: number) => {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * 1.5, ny = (dx / l) * 1.5;
      vert(x0 - nx * w0, y0 - ny * w0, -1.5, a0, 0); vert(x0 + nx * w0, y0 + ny * w0, 1.5, a0, 0); vert(x1 - nx * w1, y1 - ny * w1, -1.5, a1, 0);
      vert(x1 - nx * w1, y1 - ny * w1, -1.5, a1, 0); vert(x0 + nx * w0, y0 + ny * w0, 1.5, a0, 0); vert(x1 + nx * w1, y1 + ny * w1, 1.5, a1, 0);
    };
    const round = (x: number, y: number, r: number, amount: number) => {
      const k = 1.6, e = r * k;
      vert(x - e, y - e, -k, amount, -k); vert(x + e, y - e, k, amount, -k); vert(x - e, y + e, -k, amount, k);
      vert(x - e, y + e, -k, amount, k); vert(x + e, y - e, k, amount, -k); vert(x + e, y + e, k, amount, k);
    };
    const p = sim.sparks;
    for (let i = 0; i < sim.sparkCount; i++) {
      const o = i * SPARK_FLOATS, age = p[o + 4] / p[o + 5], fine = p[o + 7] === 1;
      // It leaves pale, cools through hot and flame to ember, and goes out.
      const a = p[o + 6] * (1.9 * (1 - age) ** 1.7 + 0.04) * (fine ? 0.8 : 1);
      const sh = S.sparks.shutter * (fine ? 0.6 : 1);
      let tx = p[o + 2] * sh, ty = p[o + 3] * sh;
      const len = Math.hypot(tx, ty), least = 2.2 * u;
      if (len < least) { const k = least / (len || 1); tx *= k; ty *= k; }
      // A long fine streak that bends back along the way it has fallen, bright at its head and gone at its tail.
      const w = (fine ? 0.45 : 0.8) * u, sag = 0.5 * S.sparks.gravity * u * sh * sh;
      const hx = p[o] - tx * 0.45, hy = p[o + 1] - ty * 0.45 + sag * 0.2;
      streak(p[o], p[o + 1], a, w, hx, hy, a * 0.45, w * 0.7);
      streak(hx, hy, a * 0.45, w * 0.7, p[o] - tx, p[o + 1] - ty + sag, 0, w * 0.25);
    }
    const f = sim.forks;
    for (let i = 0; i < sim.forkCount; i++) {
      const o = i * FORK_FLOATS, age = f[o + 4] / f[o + 5], seed = Math.floor(f[o + 6]);
      // A fork is one jagged line that thins to nothing, with a shorter one thrown off its side. It keeps its shape
      // for its short life and only dims.
      const strength = f[o + 7] * (1 - age) ** 1.2 * 8;
      const steps = S.arc.steps, each = f[o + 3] / steps;
      const draw = (x: number, y: number, angle: number, from: number, count: number, salt: number, gain: number) => {
        for (let j = from; j < from + count; j++) {
          const a = angle + (hash(j, seed, salt) - 0.5) * 1.5;
          const x1 = x + Math.cos(a) * each, y1 = y + Math.sin(a) * each;
          const k0 = 1 - (j / (from + count)) * 0.9, k1 = 1 - ((j + 1) / (from + count)) * 0.9;
          streak(x, y, strength * gain * k0, (0.16 + 0.55 * k0) * u, x1, y1, strength * gain * k1, (0.16 + 0.55 * k1) * u);
          // It splits as it goes, and each branch splits again, finer and fainter.
          if (salt < 30 && hash(j, seed, salt + 40) < (salt === 0 ? 0.55 : 0.3)) draw(x1, y1, angle + (hash(j, seed, salt + 9) < 0.5 ? -1 : 1) * (0.5 + 0.7 * hash(j, seed, salt + 5)), j + 1, salt === 0 ? 3 : 2, salt + 20 + j, gain * 0.55);
          x = x1; y = y1;
        }
      };
      draw(f[o], f[o + 1], f[o + 2], 0, steps, 0, 1);
    }
    // What a clear shard throws onto the page: needles of light that point away from the core, out past it, and
    // come and go as it turns.
    for (let i = 0; i < glints; i++) {
      const o = i * 6, a = glint[o + 4];
      if (a <= 0.02) continue;
      const x = glint[o], y = glint[o + 1], dx = glint[o + 2], dy = glint[o + 3], len = glint[o + 5];
      streak(x - dx * len, y - dy * len, 0, 0.2 * u, x, y, a, 0.5 * u);
      streak(x, y, a, 0.5 * u, x + dx * len * 1.6, y + dy * len * 1.6, 0, 0.2 * u);
    }
    // Where a leading end strikes the title or the card there is a flash, gone in a moment.
    for (let i = 0; i < 2; i++) {
      const L = route.landings[i];
      if (sim.head[0] < L.s) continue;
      const struck = sim.hit[i] * Math.exp(-(sim.time - sim.hitAt[i]) / 0.14);
      if (struck > 0.02) round(L.x, L.y - S.route.above * u, (4 + 9 * struck) * u, 3.2 * struck);
    }
    for (let b = 0; b < 2; b++) {
      if (b === 1 && sim.head[1] <= route.split) continue;
      at(route.branches[b], sim.head[b], tmp);
      const e = sim.energy[b], beat = still ? 0 : 0.12 * Math.sin(t * 9.3 + b * 2.1) * Math.sin(t * 5.1 + b);
      // A fierce point, no bigger than the core is wide. The glow round it is its own light spreading, not a ball.
      round(tmp[0], tmp[1], (2.4 + 0.9 * e) * u, 7.8 * (1 + beat));
      round(tmp[0], tmp[1], 6 * u, 1.3 * (1 + beat));
    }
    return n / STREAK_FLOATS;
  };

  // ---- shards: those riding the core, placed where the moment puts them, and those thrown loose
  const fillShards = (t: number, top: number, bottom: number, lx: number, ly: number, lz: number, led: number): number => {
    if (!route || !sim || !riders) return 0;
    const u = unit, K = S.shards, R = riders, sc = scratch;
    const reach2 = (K.turn * u) ** 2;
    let n = 0;
    const count = new Int32Array(LAYERS * KINDS);
    const place = (x: number, y: number, z: number, size: number, qx: number, qy: number, qz: number, qw: number, cx: number, cy: number, tx: number, ty: number, own: number, lit: number, clear: number, kind: number, thrown: number) => {
      // Near the cursor a shard turns its face toward it, and flashes.
      const dx = lx - x, dy = ly - y, near = Math.exp(-(dx * dx + dy * dy) / reach2) * (0.3 + 0.7 * led);
      if (near > 0.02) {
        const nx = 2 * (qx * qz + qw * qy), ny = 2 * (qy * qz - qw * qx), nz = 1 - 2 * (qx * qx + qy * qy);
        const dl = Math.hypot(dx, dy, lz - z) || 1, k = near * K.face[look];
        let gx = nx + ((dx / dl) - nx) * k, gy = ny + ((dy / dl) - ny) * k, gz = nz + (((lz - z) / dl) - nz) * k;
        const gl = Math.hypot(gx, gy, gz) || 1;
        gx /= gl; gy /= gl; gz /= gl;
        // The shortest turn that takes its face from where it looks to where it should.
        const ax = ny * gz - nz * gy, ay = nz * gx - nx * gz, az = nx * gy - ny * gx, aw = 1 + nx * gx + ny * gy + nz * gz;
        const al = Math.hypot(ax, ay, az, aw) || 1;
        const rx = ax / al, ry = ay / al, rz = az / al, rw = aw / al;
        const ox = rw * qx + rx * qw + ry * qz - rz * qy, oy = rw * qy - rx * qz + ry * qw + rz * qx, oz = rw * qz + rx * qy - ry * qx + rz * qw, ow = rw * qw - rx * qx - ry * qy - rz * qz;
        qx = ox; qy = oy; qz = oz; qw = ow;
      }
      const o = n * INSTANCE_FLOATS;
      sc[o] = x; sc[o + 1] = y; sc[o + 2] = z; sc[o + 3] = size * (1 + z * K.depth / u);
      sc[o + 4] = qx; sc[o + 5] = qy; sc[o + 6] = qz; sc[o + 7] = qw;
      sc[o + 8] = cx; sc[o + 9] = cy; sc[o + 10] = tx; sc[o + 11] = ty;
      sc[o + 12] = own; sc[o + 13] = lit; sc[o + 14] = thrown; sc[o + 15] = near;
      const key = (clear ? 2 : z < 0 ? 0 : 1) * KINDS + kind;
      keys[n++] = key;
      count[key]++;
    };

    for (let i = 0; i < R.n; i++) {
      const o = i * RIDER, b = R.branch[i], br = route.branches[b], head = sim.head[b];
      const d = (R.f[o] * br.len + t * K.flow * u * R.f[o + 1]) % br.len;
      const lead = head - d;
      if (lead <= 0) continue;
      const here = Math.min(br.n - 1, Math.floor(d / br.step));
      let grown = Math.min(1, lead / (K.grow * u));
      // Where the two sides part they share the same ground, so each brings in its second half only as they draw apart.
      if (R.spare[i]) grown *= Math.max(0, Math.min(1, br.apart[here] / (K.apart * u)));
      if (grown <= 0.02) continue;
      at(br, d, tmp);
      if (tmp[1] < top - 70 * u || tmp[1] > bottom + 70 * u) continue;
      const cx = tmp[0], cy = tmp[1], tx = tmp[2], ty = tmp[3];
      const e = sim.energy[b], hold = br.hold[here];
      // They gather and thin along the route in slow waves, so the stream has knots and open stretches. Along an
      // object there are no knots: they are spread evenly.
      const free = 0.5 + 0.5 * Math.sin(d / (K.clump * u) - t * 0.22 + 2 * Math.sin(d / (K.clump * 3.6 * u)));
      const wave = free + (0.5 - free) * Math.max(hold, br.calm[here]);
      grown *= Math.max(0, Math.min(1, (K.wave[0] + (K.wave[1] - K.wave[0]) * wave - R.f[o + 16]) / 0.1 + 1));
      if (grown <= 0.02) continue;
      // They go round the core, but quicker across its face than past its sides, so the core is never hidden for long.
      const turn = R.f[o + 3] + t * K.orbit + (d * TAU) / (K.wind * u) + 0.4 * Math.sin(t * R.f[o + 4] + R.f[o + 5]);
      const round = turn + K.aside * Math.sin(2 * turn);
      const far = R.f[o + 2] * (1 + K.spread * hold) * (1 + (K.flare + K.flareFast * e) * Math.exp(-lead / (K.flareOver * u)));
      const side = far * Math.sin(round), z = far * Math.cos(round);
      // On an object all of them ride the one side of the core, and on the inside of a turn they are squeezed
      // together. Enough are taken away in both places, and where the stream hooks round an object, that they lie no
      // thicker there than on a straight run.
      const hook = Math.min(1, Math.abs(br.bend[here]) * K.hook * u) * br.calm[here];
      grown *= Math.max(0, Math.min(1, (R.f[o + 17] - K.thin * Math.max(hold, hook) - Math.max(0, side * br.bend[here])) / 0.08 + 1));
      if (grown <= 0.02) continue;
      let x = cx - ty * side, y = cy + tx * side;
      // Nothing rides through the title or the card: what would is turned back off the nearer face.
      for (const box of route.boxes) {
        const m = R.f[o + 6] * 0.7;
        if (x <= box.l - m || x >= box.r + m || y <= box.t - m || y >= box.b) continue;
        const up = y - box.t + m, left = x - box.l + m, right = box.r - x + m;
        if (up < left && up < right) y = box.t - m - up; else if (left < right) x = box.l - m - left; else x = box.r + m + right;
      }
      const spin = R.f[o + 8] + t * R.f[o + 7], h = Math.sin(spin / 2), cw = Math.cos(spin / 2);
      // A larger clear shard near the core throws a sliver of light out past itself, on the far side from the core.
      if (R.clear[i] && R.f[o + 6] > 5.5 * u && glints < GLINTS && Math.abs(side) > 5 * u) {
        const flick = Math.sin(spin * 2.3 + R.f[o + 16] * 40) * Math.sin(spin * 1.1 + R.f[o + 3]);
        const amount = Math.max(0, flick - 0.25) * grown * 1.5 / (1 + Math.abs(side) / (26 * u));
        if (amount > 0.02) {
          const way = Math.sign(side), reach = (20 + 26 * R.f[o + 16]) * u;
          const g = glints++ * 6;
          glint[g] = x - ty * way * reach; glint[g + 1] = y + tx * way * reach; glint[g + 2] = -ty * way; glint[g + 3] = tx * way;
          glint[g + 4] = amount; glint[g + 5] = R.f[o + 6] * (0.5 + 0.5 * R.f[o + 16]);
        }
      }
      const ax = R.f[o + 9] * h, ay = R.f[o + 10] * h, az = R.f[o + 11] * h;
      const bx = R.f[o + 12], by = R.f[o + 13], bz = R.f[o + 14], bw = R.f[o + 15];
      place(x, y, z, R.f[o + 6] * grown,
        cw * bx + ax * bw + ay * bz - az * by, cw * by - ax * bz + ay * bw + az * bx, cw * bz + ax * by - ay * bx + az * bw, cw * bw - ax * bx - ay * by - az * bz,
        cx, cy, tx, ty, R.f[o + 16], 1, R.clear[i], R.kind[i], 0);
    }

    const p = sim.loose, sizes = S.sizes[look], loosest = sizes[0] * S.loose.least;
    for (let i = 0; i < sim.looseCount; i++) {
      const o = i * LOOSE_FLOATS, age = p[o + 13], life = p[o + 14];
      const x = p[o], y = p[o + 1];
      if (y < top - 60 || y > bottom + 60) continue;
      // Lit by the nearest stretch of core.
      let best = 1e12, bi = 0, bb = 0;
      for (let b = 0; b < 2; b++) {
        const br = route.branches[b], last = Math.min(br.n - 1, Math.floor(sim.head[b] / br.step));
        for (let k = b === 1 ? Math.floor(route.split / br.step) : 0; k <= last; k += 5) {
          const dx = br.x[k] - x, dy = br.y[k] - y, d2 = dx * dx + dy * dy;
          if (d2 < best) { best = d2; bi = k; bb = b; }
        }
      }
      const br = route.branches[bb];
      const size = Math.abs(p[o + 15]) * Math.min(1, age / 0.07) * Math.min(1, (life - age) / (life * S.loose.fade));
      const own = sim.looseSeed[i];
      const clear = p[o + 15] < 0 ? 1 : 0;
      const kind = look === 'first' ? Math.floor(own * FIRST_KINDS) : facetKind((Math.abs(p[o + 15]) / u - loosest) / (sizes[1] - sizes[0]), own);
      place(x, y, p[o + 2], size, p[o + 6], p[o + 7], p[o + 8], p[o + 9], br.x[bi], br.y[bi], br.tx[bi], br.ty[bi], own, 1, clear, kind, 1);
    }

    // Sort into the lots they are drawn in.
    let first = 0;
    const next = new Int32Array(LAYERS * KINDS);
    for (let k = 0; k < LAYERS * KINDS; k++) { lots[k * 2] = first; lots[k * 2 + 1] = count[k]; next[k] = first; first += count[k]; }
    for (let i = 0; i < n; i++) {
      const to = next[keys[i]]++ * INSTANCE_FLOATS, from = i * INSTANCE_FLOATS;
      for (let k = 0; k < INSTANCE_FLOATS; k++) shards[to + k] = sc[from + k];
    }
    return n;
  };

  const runs: [number, number, number, number] = [0, 0, 0, 0];
  const GLINTS = 220;
  const glint = new Float32Array(GLINTS * 6);
  let glints = 0;

  const frame = (t: number, dt: number) => {
    if (!renderer || !route || !sim || disposed) return;
    const began = performance.now();
    const top = clock.view.y - hostTop;
    const canvasTop = Math.max(0, Math.min(hostH - cssH, top - S.margin));
    canvas.style.transform = `translate3d(0,${canvasTop.toFixed(1)}px,0)`;
    const frozen = clock.isFrozen();
    let line = heldLine ?? anchorLine(top);

    if (still) {
      sim.rest(line);
    } else if (frozen) {
      if (script) {
        // A scripted scroll, for filmstrips: the whole move is run again from its start, so any moment of it can be drawn.
        const at_ = (time: number) => { const k = Math.max(0, Math.min(1, (time - script!.t0) / (script!.t1 - script!.t0))); return script!.y0 + (script!.y1 - script!.y0) * k * k * (3 - 2 * k); };
        const key = `s:${t}`;
        if (key !== settled) {
          settled = key;
          const from = script.t0 - 0.25;
          sim.settle(anchorLine(at_(from) - hostTop), from);
          let prev = anchorLine(at_(from) - hostTop);
          while (sim.time + STREAM_STEP <= t + 1e-9) {
            const l = anchorLine(at_(sim.time + STREAM_STEP) - hostTop);
            sim.step(l, (l - prev) / STREAM_STEP);
            prev = l;
          }
          scrollTo({ top: Math.round(at_(t)), left: 0, behavior: 'instant' });
        }
        line = anchorLine(at_(t) - hostTop);
      } else {
        const key = `${t}:${line.toFixed(1)}`;
        if (key !== settled) { settled = key; sim.settle(line, t); }
      }
    } else {
      settled = '';
      if (t - sim.time > 0.3 || t < sim.time - STREAM_STEP) sim.settle(line, t);
      const pace = dt > 0 ? (line - lastLine) / dt : 0;
      for (let k = 0; k < 12 && sim.time + STREAM_STEP <= t + 1e-9; k++) sim.step(line, pace);
    }
    lastLine = line;

    const now = still ? STILL_TIME : t;
    const L = lamp.get();
    const led = touch ? 1 : L.led;
    const lx = touch ? touch.x : L.px, ly = (touch ? touch.y : L.py + clock.view.y) - hostTop;
    const lz = 120 * unit;
    fillCore(canvasTop, canvasTop + cssH, runs);
    glints = 0;
    const drawn = fillShards(now, canvasTop, canvasTop + cssH, lx, ly, lz, led);
    const streakCount = fillStreaks(now);
    const f: Frame = {
      view: [0, canvasTop, cssW, cssH], time: now, unit, lamp: [lx, ly, lz, 0.5 + 0.5 * led], energy: [sim.energy[0], sim.energy[1]], split: route.split / unit, look, presence,
      core, coreRuns: runs, streaks, streakCount, shards, lots,
    };
    renderer.draw(f);
    spent += (performance.now() - began - spent) * 0.1;
    stats.streamMs = spent;
    stats.streamShards = drawn;
    stats.streamSparks = sim.sparkCount;
    stats.streamLoose = sim.looseCount;
  };

  // A finger or a pen puts the light where it touches and leaves it there. A mouse hands it back to the lamp.
  const point = (e: PointerEvent) => { touch = e.pointerType === 'mouse' ? null : { x: e.pageX, y: e.pageY }; };
  addEventListener('pointerdown', point, { passive: true });
  addEventListener('pointermove', point, { passive: true });

  let offFrame = () => {};
  let offTier = () => {};
  const resized = new ResizeObserver(() => build());
  const ready = registry.track(document.fonts.ready.then(() => document.fonts.load(getComputedStyle(opts.title).font || '600 16px Sora')).catch(() => undefined).then(() => {
    if (disposed) return;
    build();
    offFrame = clock.onFrame(frame);
    offTier = tiers.subscribe(build);
    resized.observe(host);
    resized.observe(canvas);
  }));
  void ready;

  registry.tool('streamState', () => ({ on: host.dataset.stream, look, unit, shards: stats.streamShards, sparks: sim?.sparkCount ?? 0, loose: sim?.looseCount ?? 0, head: sim ? [sim.head[0], sim.head[1]] : [], energy: sim ? [sim.energy[0], sim.energy[1]] : [], riders: riders?.n ?? 0 }));
  // How many shards the last frame drew inside a rectangle of the page, how many of those were thrown loose, and how
  // much of the route runs through it.
  registry.tool('streamCount', (l: number, t: number, r: number, b: number) => {
    let riding = 0, loose = 0, length = 0;
    if (route && sim) for (let k = 0; k < 2; k++) {
      const br = route.branches[k], last = Math.min(br.n - 1, Math.floor(sim.head[k] / br.step));
      for (let i = k === 1 ? Math.ceil(route.split / br.step) : 0; i <= last; i++) if (br.x[i] >= l && br.x[i] <= r && br.y[i] >= t && br.y[i] <= b) length += br.step;
    }
    for (let i = 0; i < stats.streamShards; i++) {
      const o = i * INSTANCE_FLOATS, x = shards[o], y = shards[o + 1];
      if (x < l || x > r || y < t || y > b || shards[o + 3] < 0.5) continue;
      if (shards[o + 14] > 0.5) loose++; else riding++;
    }
    return { riding, loose, length };
  });
  // Every thrown shard as its own number, x and y, so a script can follow each one from frame to frame.
  registry.tool('streamThrown', () => {
    const out: number[] = [];
    if (sim) for (let i = 0; i < sim.looseCount; i++) out.push(sim.looseSeed[i], sim.loose[i * LOOSE_FLOATS], sim.loose[i * LOOSE_FLOATS + 1]);
    return out;
  });
  // streamPlay(fromScroll, toScroll, fromTime, toTime) scripts a scroll for frozen frames. streamPlay() ends it.
  registry.tool('streamPlay', (y0?: number, y1?: number, t0?: number, t1?: number) => {
    script = y0 === undefined || y1 === undefined ? null : { y0, y1, t0: t0 ?? 1, t1: t1 ?? 2 };
    settled = '';
  });

  return {
    setLook(next: Look) {
      if (next === look || disposed) return;
      look = next;
      populate();
      if (!still) sim?.settle(lastLine, clock.now());
    },
    dispose() {
      disposed = true;
      offFrame();
      offTier();
      resized.disconnect();
      removeEventListener('pointerdown', point);
      removeEventListener('pointermove', point);
      renderer?.dispose();
      renderer = null;
      canvas.remove();
      delete host.dataset.stream;
    },
  };
}
