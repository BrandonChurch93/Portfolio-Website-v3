import { registry, stats } from '../../hooks/registry';
import { HANDHELD } from '../../config/site';
import { clock } from '../../world/clock';
import { sweep } from '../../world/contexts';
import { handheld } from '../../world/device';
import { liven } from './alive';
import { DEEP, DEEP_CAP, DEEP_HALO, FINDS, GAS, clusterAt, clusterHeart, clusterPicture, clusterStars, deepMask, deepStars, farGalaxies, findDraws, findSize, follow, gasFrame, isDeep, type Pool, type Smudge } from './deep';
import { CRATER, SECOND, SPARK, SPLAT, TILT, TINT, craters, meteorAt, meteors, mix3, scale3, sparks, stars, type Meteor, type V3 } from './field';
import { BAND_FS, BLIT_FS, DEEP_FIND_FS, DEEP_FIND_VS, DEEP_FOUND_FS, DEEP_FS, DEEP_GAS_FS, DEEP_LAY_FS, DEEP_SMUDGE_FS, DEEP_STAR_FS, GLOW_FS, HEIGHT_FS, METEOR_FS, MOON_FS, RECT_VS, RESOLVE_FS, SPARK_FS, SPARK_VS, SPLAT_FS, SPLAT_VS } from './shaders';

// The night sky of the hero, on its own canvas: the stars, the bright few with four points, a moon, a band of far
// stars, the city's glow, and now and then a meteor. What never changes is drawn once into a texture when the plan
// changes. Each frame after that draws only the texture, the bright few and a meteor, and only when one of them has
// changed.

export interface Oval { x: number; y: number; rx: number; ry: number }

// Everything the page tells the sky, in CSS pixels of the host.
export interface SkyPlan {
  w: number;
  h: number;
  // How many pixels one unit of the page's board is.
  u: number;
  // The block of his words: kept wholly clear, the stars thinning toward it.
  words: Oval;
  // The city's glow, drawn as light, and what the stars fade into. strength 1 is as designed.
  glow: Oval & { strength: number };
  // with: a thin ring round the moon, a small second moon beside it, or neither.
  moon: { x: number; y: number; r: number; with: 'none' | 'ring' | 'moon' };
  // turn: degrees, as an SVG rotate.
  band: Oval & { turn: number };
  // How far down the host the sky ends. No star below it.
  end: number;
  // The world's outline against the sky, where the page has one: how far down the host the highest thing is, at a
  // place across it. The deep sky keeps clear of it (deep.ts).
  land?: (x: number) => number;
}

export interface Sky { replan(): void; dispose(): void; meteor(): void }
export { isDeep };

const MAX_DPR = 2;
const TWINKLE = { hz: 20, amp: 0.22 } as const;
// How bright anything in the sky may get: a share of pale gold.
const CEIL = 0.8;
const BAND = { bright: 0.056 } as const;
const GLOW = { peak: 0.13, down: 0.42 } as const;
const MOON = {
  sun: [-0.7, -0.36, 0.62] as V3,
  earth: [0.18, -0.3, 1] as V3,
  sunI: 0.5,
  earthI: 0.0022,
  exag: 1.0,
  haloI: 0.006,
  span: 1.02,
  mare: [[-0.42, -0.12, 0.5], [0.0, -0.55, 0.4], [0.45, 0.05, 0.36], [-0.45, 0.55, 0.3]] as [number, number, number][],
  ring: { open: 0.2, roll: -0.36, r: [1.62, 2.12] as [number, number] },
} as const;

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const onSphere = (x: number, y: number): V3 => [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))];

type Prog = { p: WebGLProgram; u: (n: string) => WebGLUniformLocation | null };

function program(gl: WebGL2RenderingContext, vs: string, fs: string): Prog {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as [number, string][]) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(`sky shader: ${gl.getShaderInfoLog(sh)}`);
    gl.attachShader(p, sh);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`sky program: ${gl.getProgramInfoLog(p)}`);
  const found = new Map<string, WebGLUniformLocation | null>();
  return { p, u: (n) => { if (!found.has(n)) found.set(n, gl.getUniformLocation(p, n)); return found.get(n)!; } };
}

function target(gl: WebGL2RenderingContext, w: number, h: number, float: boolean): { fb: WebGLFramebuffer; tex: WebGLTexture } {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, float ? gl.RGBA16F : gl.RGBA8, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { fb, tex };
}

// On a handheld the sky is drawn once, as it is for a visitor who asks for reduced motion, and kept as a picture in a
// plain 2D canvas: its WebGL context is let go once it has drawn (HANDHELD.sky). A new plan draws it again.
export function mountSky(host: HTMLElement, plan: () => SkyPlan): Sky {
  if (!handheld() || HANDHELD.sky !== 'still') return mountLive(host, plan, false);
  const sized = () => { const p = plan(); return `${Math.round(p.w)}:${Math.round(p.h)}:${Math.round(p.end)}`; };
  let made = sized(), now = mountLive(host, plan, true);
  return {
    replan() { const k = sized(); if (k === made) return; made = k; now.dispose(); now = mountLive(host, plan, true); },
    meteor() {},
    dispose() { now.dispose(); },
  };
}

function mountLive(host: HTMLElement, plan: () => SkyPlan, keep: boolean): Sky {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none', display: 'block' });
  // Where the browser can, the sky is added to the page as light: a premultiplied canvas that is nearly clear is
  // blended with the ground rounded down in WebKit, which drew a dark ring where the glow begins.
  const add = typeof CSS !== 'undefined' && CSS.supports('mix-blend-mode', 'plus-lighter');
  if (add) canvas.style.mixBlendMode = 'plus-lighter';
  host.appendChild(canvas);
  const glOr = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, still = keep || reduced;
  if (!glOr) return { replan() {}, dispose() { canvas.remove(); }, meteor() {} };
  const gl = glOr;

  let progs: Record<'splat' | 'band' | 'glow' | 'height' | 'moon' | 'resolve' | 'blit' | 'spark' | 'meteor', Prog>;
  let quad: WebGLBuffer, splatVao: WebGLVertexArrayObject, sparkVao: WebGLVertexArrayObject, rectVao: WebGLVertexArrayObject, bareVao: WebGLVertexArrayObject;
  let splatBuf: WebGLBuffer, sparkBuf: WebGLBuffer;
  let floatOk = false;
  let sky: { fb: WebGLFramebuffer; tex: WebGLTexture } | null = null;
  let W = 1, H = 1, s = 1, sparkCount = 0, alive = true, dirty = true, visible = true, last = '';
  let falls: Meteor[] = [], brightest: { x: number; y: number; big: boolean }[] = [];
  // The deep sky (deep.ts), with ?sky=deep: its stars with the things to find among them and its gas, each a picture
  // drawn once, and the pointer's pools, a few numbers a frame. mark is those numbers as one, so a pointer at rest
  // asks for no frame of its own. A handheld keeps today's sky.
  const pointer = !still && !handheld() && isDeep(new URLSearchParams(location.search)) ? follow(host) : null;
  let deep: { star: Prog; find: Prog; found: Prog; smudge: Prog; lay: Prog; gas: Prog; show: Prog } | null = null, plate: { fb: WebGLFramebuffer; tex: WebGLTexture } | null = null, plateH = 1, pools: Pool[] = [], mark = 0;
  let gas: { fb: WebGLFramebuffer; tex: WebGLTexture } | null = null, gasW = 1, gasH = 1, gasG = 1;
  const pooled = new Float32Array((DEEP.pools + 1) * 3);
  let forced: { at: number; m: Meteor } | null = null;
  let current: SkyPlan | null = null;
  const white = scale3(TINT.pale, CEIL);

  const init = () => {
    floatOk = !!gl.getExtension('EXT_color_buffer_float');
    progs = {
      splat: program(gl, SPLAT_VS, SPLAT_FS),
      band: program(gl, RECT_VS, BAND_FS),
      glow: program(gl, RECT_VS, GLOW_FS),
      height: program(gl, RECT_VS, HEIGHT_FS),
      moon: program(gl, RECT_VS, MOON_FS),
      resolve: program(gl, RECT_VS, RESOLVE_FS),
      blit: program(gl, RECT_VS, BLIT_FS),
      spark: program(gl, SPARK_VS, SPARK_FS),
      meteor: program(gl, RECT_VS, METEOR_FS),
    };
    deep = pointer ? { star: program(gl, SPLAT_VS, DEEP_STAR_FS), find: program(gl, DEEP_FIND_VS, DEEP_FIND_FS), found: program(gl, RECT_VS, DEEP_FOUND_FS), smudge: program(gl, RECT_VS, DEEP_SMUDGE_FS), lay: program(gl, RECT_VS, DEEP_LAY_FS), gas: program(gl, RECT_VS, DEEP_GAS_FS), show: program(gl, RECT_VS, DEEP_FS) } : null;
    quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    rectVao = gl.createVertexArray()!;
    gl.bindVertexArray(rectVao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    splatBuf = gl.createBuffer()!;
    splatVao = gl.createVertexArray()!;
    gl.bindVertexArray(splatVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, splatBuf);
    const fs = SPLAT * 4;
    for (const [loc, n, off] of [[1, 2, 0], [2, 3, 2], [3, 3, 5]]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, fs, off * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    sparkBuf = gl.createBuffer()!;
    sparkVao = gl.createVertexArray()!;
    gl.bindVertexArray(sparkVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, sparkBuf);
    const ss = SPARK * 4;
    for (const [loc, n, off] of [[1, 2, 0], [2, 3, 2], [3, 4, 5], [4, 2, 9]]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, ss, off * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    bareVao = gl.createVertexArray()!;
    gl.bindVertexArray(null);
  };

  const rect = (pr: Prog, x0: number, y0: number, x1: number, y1: number, w = W, h = H) => {
    gl.uniform2f(pr.u('uSize'), w, h);
    gl.uniform4f(pr.u('uRect'), x0, y0, x1, y1);
    gl.bindVertexArray(rectVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // Waits until the graphics card has drawn what it was given, so that a time counted after it is the drawing's own.
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

  // One moon: its surface worked out into a texture, then lit into the sky.
  const body = (cx: number, cy: number, R: number, crs: Float32Array, look: { mare: boolean; ring: boolean; seed: number; dark: number; high: V3; low: V3 }) => {
    const N = Math.min(1024, Math.max(160, Math.ceil(2 * R * MOON.span * 1.6)));
    const ht = target(gl, N, N, floatOk);
    const crTex = gl.createTexture()!;
    const count = crs.length / CRATER;
    gl.bindTexture(gl.TEXTURE_2D, crTex);
    const packed = new Float32Array(count * 8);
    for (let i = 0; i < count; i++) for (let k = 0; k < 4; k++) { packed[i * 4 + k] = crs[i * CRATER + k]; packed[(count + i) * 4 + k] = crs[i * CRATER + 4 + k]; }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, count, 2, 0, gl.RGBA, gl.FLOAT, packed);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const hp = progs.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, ht.fb);
    gl.viewport(0, 0, N, N);
    gl.disable(gl.BLEND);
    gl.useProgram(hp.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, crTex);
    gl.uniform1i(hp.u('uCr'), 0);
    gl.uniform1i(hp.u('uCount'), count);
    gl.uniform1f(hp.u('uFlood'), look.mare ? 0.85 : 0);
    gl.uniform1f(hp.u('uN'), N);
    gl.uniform1f(hp.u('uSpan'), MOON.span);
    gl.uniform1f(hp.u('uPx'), R);
    gl.uniform1f(hp.u('uSeed'), look.seed);
    gl.uniform1f(hp.u('uMareDark'), look.dark);
    const mare = new Float32Array(16);
    if (look.mare) MOON.mare.forEach(([x, y, r], i) => { const v = onSphere(x, y); mare.set([v[0], v[1], v[2], r], i * 4); });
    gl.uniform4fv(hp.u('uMare'), mare);
    rect(hp, 0, 0, N, N, N, N);

    gl.bindFramebuffer(gl.FRAMEBUFFER, sky!.fb);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const mp = progs.moon;
    gl.useProgram(mp.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ht.tex);
    gl.uniform1i(mp.u('uHt'), 0);
    gl.uniform2f(mp.u('uCen'), cx, cy);
    gl.uniform1f(mp.u('uRad'), R);
    gl.uniform1f(mp.u('uSpan'), MOON.span);
    gl.uniform1f(mp.u('uTexN'), N);
    gl.uniform3fv(mp.u('uSun'), norm(MOON.sun));
    gl.uniform3fv(mp.u('uEarth'), norm(MOON.earth));
    gl.uniform1f(mp.u('uSunI'), MOON.sunI);
    gl.uniform1f(mp.u('uEarthI'), MOON.earthI);
    gl.uniform1f(mp.u('uExag'), MOON.exag);
    gl.uniform3fv(mp.u('uHigh'), look.high);
    gl.uniform3fv(mp.u('uMareC'), look.low);
    gl.uniform3fv(mp.u('uEarthC'), mix3(TINT.hot, TINT.pale, 0.4));
    gl.uniform3fv(mp.u('uHaloC'), mix3(TINT.pale, TINT.hot, 0.3));
    gl.uniform1f(mp.u('uHaloI'), MOON.haloI);
    const { open, roll, r } = MOON.ring;
    gl.uniform1i(mp.u('uRing'), look.ring ? 1 : 0);
    gl.uniform3fv(mp.u('uRingN'), [-Math.sin(roll) * Math.cos(open), Math.cos(roll) * Math.cos(open), Math.sin(open)]);
    gl.uniform2f(mp.u('uRingR'), r[0], r[1]);
    gl.uniform3fv(mp.u('uRingC'), mix3(TINT.text, TINT.copper, 0.3));
    const reach = (look.ring ? r[1] + 0.1 : 2.7) * R;
    gl.uniform2f(mp.u('uSize'), W, H);
    rect(mp, cx - reach, cy - reach, cx + reach, cy + reach);
    gl.deleteFramebuffer(ht.fb);
    gl.deleteTexture(ht.tex);
    gl.deleteTexture(crTex);
  };

  const build = () => {
    const t0 = performance.now();
    const p = plan();
    current = p;
    s = Math.min(MAX_DPR, devicePixelRatio || 1, handheld() ? Math.sqrt(HANDHELD.screen / Math.max(1, p.w * p.h)) : Infinity);
    W = Math.max(1, Math.round(p.w * s));
    H = Math.max(1, Math.round(p.h * s));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    if (sky) { gl.deleteFramebuffer(sky.fb); gl.deleteTexture(sky.tex); sky = null; }
    if (plate) { gl.deleteFramebuffer(plate.fb); gl.deleteTexture(plate.tex); plate = null; }
    if (gas) { gl.deleteFramebuffer(gas.fb); gl.deleteTexture(gas.tex); gas = null; }

    const field = stars(p, s);
    const bright = sparks(p, s);
    falls = meteors(p, bright.at);
    brightest = bright.at;
    sparkCount = bright.count;
    gl.bindBuffer(gl.ARRAY_BUFFER, splatBuf);
    gl.bufferData(gl.ARRAY_BUFFER, field.data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, sparkBuf);
    gl.bufferData(gl.ARRAY_BUFFER, bright.data, gl.STATIC_DRAW);
    const cpu = performance.now() - t0;

    const acc = target(gl, W, H, floatOk);
    sky = acc;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);

    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
    const sp = progs.splat;
    gl.useProgram(sp.p);
    gl.uniform2f(sp.u('uSize'), W, H);
    gl.uniform1f(sp.u('uS'), s);
    gl.uniform2f(sp.u('uTilt'), Math.cos(TILT), Math.sin(TILT));
    gl.bindVertexArray(splatVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, field.count);

    const bp = progs.band, t = (p.band.turn * Math.PI) / 180, ax = Math.cos(t), ay = Math.sin(t);
    const corners = [[-2, -4], [2, -4], [-2, 4], [2, 4]].map(([a, b]) => [p.band.x + a * p.band.rx * ax - b * p.band.ry * ay, p.band.y + a * p.band.rx * ay + b * p.band.ry * ax]);
    const bx0 = Math.max(0, Math.min(...corners.map((c) => c[0]))) * s, bx1 = Math.min(p.w, Math.max(...corners.map((c) => c[0]))) * s;
    const by0 = Math.max(0, Math.min(...corners.map((c) => c[1]))) * s, by1 = Math.min(p.end, Math.max(...corners.map((c) => c[1]))) * s;
    gl.useProgram(bp.p);
    gl.uniform2f(bp.u('uC'), p.band.x * s, p.band.y * s);
    gl.uniform2f(bp.u('uAx'), ax, ay);
    gl.uniform2f(bp.u('uR'), p.band.rx * s, p.band.ry * s);
    gl.uniform4f(bp.u('uClear'), p.words.x * s, p.words.y * s, p.words.rx * s, p.words.ry * s);
    gl.uniform1f(bp.u('uEnd'), p.end * s);
    gl.uniform1f(bp.u('uFade'), 0.12 * p.h * s);
    gl.uniform1f(bp.u('uS'), s);
    gl.uniform1f(bp.u('uBright'), BAND.bright);
    gl.uniform3fv(bp.u('uBody'), mix3(TINT.text, TINT.pale, 0.55));
    gl.uniform3fv(bp.u('uCore'), mix3(TINT.pale, TINT.hot, 0.4));
    if (bx1 > bx0 && by1 > by0) {
      gl.blendFuncSeparate(gl.ZERO, gl.SRC_COLOR, gl.ZERO, gl.ONE);
      gl.uniform1i(bp.u('uMode'), 0);
      rect(bp, bx0, by0, bx1, by1);
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
      gl.uniform1i(bp.u('uMode'), 1);
      rect(bp, bx0, by0, bx1, by1);
    }

    if (p.glow.strength > 0) {
      const gp = progs.glow, down = Math.max(1, Math.min(GLOW.down * p.glow.ry, p.h - p.glow.y - 2));
      gl.useProgram(gp.p);
      gl.uniform4f(gp.u('uGlow'), p.glow.x * s, p.glow.y * s, p.glow.rx * s, p.glow.ry * s);
      gl.uniform1f(gp.u('uDown'), down * s);
      gl.uniform1f(gp.u('uStrength'), p.glow.strength * GLOW.peak);
      gl.uniform3fv(gp.u('uHotC'), mix3(TINT.flame, TINT.hot, 0.22));
      gl.uniform3fv(gp.u('uDeepC'), mix3(TINT.ember, TINT.flame, 0.35));
      rect(gp, Math.max(0, p.glow.x - p.glow.rx) * s, Math.max(0, p.glow.y - p.glow.ry) * s, Math.min(p.w, p.glow.x + p.glow.rx) * s, Math.min(p.h, p.glow.y + down) * s);
    }

    const R = p.moon.r * s;
    body(p.moon.x * s, p.moon.y * s, R, craters(4711, 36, [
      { at: [0.2, 0.3], r: 0.27, kind: 2, peak: 0.3 },
      { at: [-0.38, -0.32], r: 0.05, kind: 1, peak: 0.4 },
      { at: [-0.05, -0.72], r: 0.035, kind: 1, peak: 0 },
      { at: [0.55, -0.2], r: 0.11, kind: 0, peak: 0.35 },
    ]), { mare: true, ring: p.moon.with === 'ring', seed: 3.7, dark: 0.36, high: mix3(TINT.text, TINT.pale, 0.7), low: mix3(mix3(TINT.text, TINT.pale, 0.5), TINT.bronze, 0.14) });
    if (p.moon.with === 'moon') {
      body((p.moon.x + SECOND.dx * p.moon.r) * s, (p.moon.y + SECOND.dy * p.moon.r) * s, R * SECOND.r, craters(907, 14, [
        { at: [-0.25, 0.1], r: 0.36, kind: 0, peak: 0.45 },
      ]), { mare: false, ring: false, seed: 9.1, dark: 0.5, high: mix3(TINT.text, TINT.pale, 0.6), low: mix3(TINT.text, TINT.pale, 0.6) });
    }

    const out = target(gl, W, H, false);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
    gl.disable(gl.BLEND);
    const rp = progs.resolve;
    gl.useProgram(rp.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, acc.tex);
    gl.uniform1i(rp.u('uAcc'), 0);
    gl.uniform3fv(rp.u('uWhite'), white);
    gl.uniform1i(rp.u('uAdd'), add ? 1 : 0);
    rect(rp, 0, 0, W, H);
    gl.deleteFramebuffer(acc.fb);
    gl.deleteTexture(acc.tex);
    sky = out;
    const hooked = new URLSearchParams(location.search).has('hook');
    let hidden = 0, hiddenCpu = 0, gasMs = 0, found = 0, findMs = 0, ballStars = 0, farCount = 0;
    if (deep) {
      const t1 = performance.now(), field = deepStars(p, s), dp = deep.star;
      hidden = field.count;
      hiddenCpu = performance.now() - t1;
      plateH = Math.max(1, Math.min(H, Math.ceil(p.end * s)));
      plate = target(gl, W, plateH, false);
      gl.viewport(0, 0, W, plateH);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX);
      gl.useProgram(dp.p);
      gl.uniform2f(dp.u('uSize'), W, plateH);
      gl.uniform1f(dp.u('uS'), s);
      gl.uniform1f(dp.u('uHalo'), DEEP_HALO * s);
      gl.bindBuffer(gl.ARRAY_BUFFER, splatBuf);
      gl.bufferData(gl.ARRAY_BUFFER, field.data, gl.STATIC_DRAW);
      gl.bindVertexArray(splatVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, field.count);
      gl.blendEquation(gl.FUNC_ADD);
      if (hooked) sync();

      const t2 = performance.now(), mask = deepMask(p), frame = gasFrame(p), gp = deep.gas, maskTex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, mask.cols, mask.rows, 0, gl.RED, gl.UNSIGNED_BYTE, mask.data);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
      for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);

      // What the hidden stars' picture holds under a square of it, as a picture of its own (OVER in shaders.ts).
      const under = (x0: number, y0: number, S: number): WebGLTexture => {
        const tex = gl.createTexture()!, low = plateH - y0 - S;
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, S, S);
        for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
        const a = Math.max(0, x0), b = Math.max(0, low), w = Math.min(W, x0 + S) - a, h = Math.min(plateH, low + S) - b;
        if (w > 0 && h > 0) gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, a - x0, b - low, a, b, w, h);
        gl.activeTexture(gl.TEXTURE0);
        return tex;
      };
      // A soft oval drawn into a picture w by h that begins at (ox, oy) of the hidden stars'.
      const smudge = (m: Smudge, w: number, h: number, ox: number, oy: number) => {
        const sp = deep!.smudge;
        gl.useProgram(sp.p);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, maskTex);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(sp.u('uMask'), 1);
        gl.uniform3f(sp.u('uGrid'), mask.cols, mask.rows, GAS.mask);
        gl.uniform1f(sp.u('uS'), s);
        gl.uniform2f(sp.u('uOff'), ox, oy);
        gl.uniform4f(sp.u('uAt'), m.at[0], m.at[1], Math.cos(m.turn), Math.sin(m.turn));
        gl.uniform2f(sp.u('uLong'), m.long, m.flat);
        gl.uniform3fv(sp.u('uTone'), m.tone);
        gl.uniform4fv(sp.u('uFalls'), m.falls);
        gl.uniform4f(sp.u('uWide'), m.wide[0], m.wide[1], m.show[0], m.show[1]);
        gl.uniform1f(sp.u('uGrain'), m.grain);
        rect(sp, m.at[0] - ox - m.reach, m.at[1] - oy - m.reach, m.at[0] - ox + m.reach, m.at[1] - oy + m.reach, w, h);
      };

      // The things to find: each galaxy's points are summed in a float picture of its own, a part to a channel, and
      // that is laid into the hidden stars' picture as the stars are. Without a float picture to sum in, or points
      // as large as its widest, there are none.
      const t3 = performance.now(), most = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1];
      if (floatOk && most >= FINDS.point.large) {
        const fp = deep.find, cp = deep.found, rad = Math.PI / 180;
        for (const g of FINDS.galaxies) {
          const R = g.r * p.u * s, S = findSize(R), own = target(gl, S, S, true);
          gl.viewport(0, 0, S, S);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(fp.p);
          gl.bindVertexArray(bareVao);
          gl.uniform1f(fp.u('uSeed'), g.seed);
          gl.uniform4f(fp.u('uView'), Math.cos(g.tilt * rad), Math.sin(g.tilt * rad), Math.cos(g.turn * rad), Math.sin(g.turn * rad));
          for (const d of findDraws(g, R)) {
            gl.uniform1ui(fp.u('uKey'), d.key);
            gl.uniform1i(fp.u('uKind'), d.kind);
            gl.uniform4fv(fp.u('uArm'), d.arm);
            gl.uniform4fv(fp.u('uThrow'), d.thrown);
            gl.uniform3fv(fp.u('uDisc'), d.disc);
            gl.uniform3f(fp.u('uPic'), S, R, Math.min(d.size, most));
            gl.uniform1f(fp.u('uLight'), d.light);
            gl.uniform4fv(fp.u('uGauss'), d.gauss);
            gl.uniform4fv(fp.u('uInto'), d.into);
            gl.drawArrays(gl.POINTS, 0, d.count);
            found += d.count;
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, plate.fb);
          gl.viewport(0, 0, W, plateH);
          const x0 = Math.floor(g.at[0] * p.u * s) - (S - 1) / 2, y0 = Math.floor(g.at[1] * p.u * s) - (S - 1) / 2, was = under(x0, y0, S);
          gl.disable(gl.BLEND);
          gl.useProgram(cp.p);
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, maskTex);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, own.tex);
          gl.uniform1i(cp.u('uAcc'), 0);
          gl.uniform1i(cp.u('uMask'), 1);
          gl.uniform1i(cp.u('uUnder'), 2);
          gl.uniform3f(cp.u('uGrid'), mask.cols, mask.rows, GAS.mask);
          gl.uniform1f(cp.u('uS'), s);
          gl.uniform4f(cp.u('uPlace'), x0, y0, S, R);
          gl.uniform3f(cp.u('uTurn'), Math.cos(g.turn * rad), Math.sin(g.turn * rad), 0.6 + 0.4 * Math.cos(g.tilt * rad));
          gl.uniform3f(cp.u('uLook'), g.heart, g.stretch, g.peak / 255);
          gl.uniform2f(cp.u('uShow'), g.show[0], g.show[1]);
          rect(cp, x0, y0, x0 + S, y0 + S, W, plateH);
          gl.enable(gl.BLEND);
          gl.deleteFramebuffer(own.fb);
          gl.deleteTexture(own.tex);
          gl.deleteTexture(was);
        }
      }

      // The cluster over his name: its stars and its glow are summed in a float picture of their own, which holds
      // more light than the hidden stars' picture can, and that is laid in as a galaxy is. Without a float picture
      // there is none.
      if (floatOk) {
        const pic = clusterPicture(p, s), S = pic.size, own = target(gl, S, S, true), ball = clusterStars(p, s), lp = deep.lay;
        ballStars = ball.count;
        gl.viewport(0, 0, S, S);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX);
        gl.useProgram(dp.p);
        gl.uniform2f(dp.u('uSize'), S, S);
        gl.bindBuffer(gl.ARRAY_BUFFER, splatBuf);
        gl.bufferData(gl.ARRAY_BUFFER, ball.data, gl.STATIC_DRAW);
        gl.bindVertexArray(splatVao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ball.count);
        smudge(clusterHeart(p, s), S, S, pic.x, pic.y);
        gl.blendEquation(gl.FUNC_ADD);
        gl.bindFramebuffer(gl.FRAMEBUFFER, plate.fb);
        gl.viewport(0, 0, W, plateH);
        const was = under(pic.x, pic.y, S);
        gl.disable(gl.BLEND);
        gl.useProgram(lp.p);
        gl.bindTexture(gl.TEXTURE_2D, own.tex);
        gl.uniform1i(lp.u('uAcc'), 0);
        gl.uniform1i(lp.u('uUnder'), 2);
        gl.uniform3f(lp.u('uPlace'), pic.x, pic.y, S);
        rect(lp, pic.x, pic.y, pic.x + S, pic.y + S, W, plateH);
        gl.enable(gl.BLEND);
        gl.deleteFramebuffer(own.fb);
        gl.deleteTexture(own.tex);
        gl.deleteTexture(was);
      }

      // The far galaxies are faint enough to be added to the hidden stars' picture as the stars are.
      gl.bindFramebuffer(gl.FRAMEBUFFER, plate.fb);
      gl.viewport(0, 0, W, plateH);
      gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX);
      for (const m of farGalaxies(p, s)) {
        smudge(m, W, plateH, 0, 0);
        farCount++;
      }
      gl.blendEquation(gl.FUNC_ADD);
      if (hooked) {
        sync();
        findMs = performance.now() - t3;
      }

      gasG = Math.min(s, GAS.texel);
      gasW = Math.max(1, Math.ceil(p.w * gasG));
      gasH = Math.max(1, Math.ceil(p.end * gasG));
      gas = target(gl, gasW, gasH, false);
      gl.viewport(0, 0, gasW, gasH);
      gl.disable(gl.BLEND);
      gl.useProgram(gp.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.uniform1i(gp.u('uMask'), 0);
      gl.uniform3f(gp.u('uGrid'), mask.cols, mask.rows, GAS.mask);
      gl.uniform1f(gp.u('uG'), gasG);
      gl.uniform1f(gp.u('uU'), p.u);
      gl.uniform4f(gp.u('uWords'), p.words.x, p.words.y, p.words.rx, p.words.ry);
      gl.uniform4fv(gp.u('uBand'), frame.band);
      gl.uniform2fv(gp.u('uAxis'), frame.axis);
      gl.uniform4fv(gp.u('uLight'), frame.light);
      rect(gp, 0, 0, gasW, gasH, gasW, gasH);
      gl.deleteTexture(maskTex);
      if (hooked) {
        sync();
        gasMs = performance.now() - t2 - findMs;
      }
      gl.viewport(0, 0, W, H);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (hooked) {
      sync();
      stats.skyBuildMs = performance.now() - t0;
      stats.skyBuildCpuMs = cpu;
      stats.skyStars = field.count;
      stats.skyFaint = field.counts.faint;
      stats.skyClear = field.counts.clear;
      stats.skyBright = field.counts.bright;
      stats.skySparks = sparkCount;
      stats.skyDeepStars = hidden;
      stats.skyDeepCpuMs = hiddenCpu;
      stats.skyDeepGasMs = gasMs;
      stats.skyDeepGasPx = deep ? gasW * gasH : 0;
      stats.skyDeepFindMs = findMs;
      stats.skyDeepFindPoints = found;
      stats.skyDeepCluster = ballStars;
      stats.skyDeepFar = farCount;
    }
    dirty = true;
  };

  const meteorNow = (t: number): { m: Meteor; k: NonNullable<ReturnType<typeof meteorAt>> } | null => {
    if (still) return null;
    if (forced) {
      const k = meteorAt({ ...forced.m, at: forced.at }, t);
      if (k) return { m: forced.m, k };
    }
    for (const m of falls) {
      if (m.at > t) break;
      const k = meteorAt(m, t);
      if (k) return { m, k };
    }
    return null;
  };

  let draws = 0;
  const draw = (t: number) => {
    if (!sky) return;
    const t0 = performance.now();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    const bl = progs.blit;
    gl.useProgram(bl.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sky.tex);
    gl.uniform1i(bl.u('uTex'), 0);
    rect(bl, 0, 0, W, H);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const tw = Math.floor(t * TWINKLE.hz) / TWINKLE.hz;
    if (sparkCount) {
      const sp = progs.spark;
      gl.useProgram(sp.p);
      gl.uniform2f(sp.u('uSize'), W, H);
      gl.uniform1f(sp.u('uT'), tw);
      gl.uniform1f(sp.u('uAmp'), still ? 0 : TWINKLE.amp);
      gl.uniform1f(sp.u('uS'), s);
      gl.uniform3fv(sp.u('uWhite'), white);
      gl.uniform3fv(sp.u('uRayC'), TINT.hot);
      gl.uniform2f(sp.u('uTilt'), Math.cos(TILT), Math.sin(TILT));
      gl.bindVertexArray(sparkVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, sparkCount);
    }
    const now = meteorNow(t);
    if (now) {
      const { m, k } = now, mp = progs.meteor;
      const ax = (m.x0 + (m.x1 - m.x0) * k.tail) * s, ay = (m.y0 + (m.y1 - m.y0) * k.tail) * s;
      const bx = (m.x0 + (m.x1 - m.x0) * k.head) * s, by = (m.y0 + (m.y1 - m.y0) * k.head) * s;
      const pad = 10 * s;
      gl.useProgram(mp.p);
      gl.uniform2f(mp.u('uA'), ax, ay);
      gl.uniform2f(mp.u('uB'), bx, by);
      gl.uniform1f(mp.u('uLight'), k.light * m.bright);
      gl.uniform1f(mp.u('uSpark'), k.spark * m.bright);
      gl.uniform1f(mp.u('uS'), s);
      gl.uniform3fv(mp.u('uWhite'), white);
      gl.uniform3fv(mp.u('uHeadC'), TINT.pale);
      gl.uniform3fv(mp.u('uTrailC'), mix3(TINT.pale, TINT.hot, 0.6));
      gl.uniform3fv(mp.u('uTailC'), mix3(TINT.hot, TINT.flame, 0.6));
      rect(mp, Math.min(ax, bx) - pad, Math.min(ay, by) - pad, Math.max(ax, bx) + pad, Math.max(ay, by) + pad);
    }
    // The deep sky goes on last, as a share of the way from what is drawn to the most the sky may hold, so that no
    // star of today's or meteor with gas or a hidden star under it is carried over that.
    if (deep && plate && gas && current && pools.length) {
      const reach = DEEP.reach * current.u, dp = deep.show;
      let n = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const k of pools) {
        if (k.s <= DEEP.first || n > DEEP.pools) continue;
        const r = reach * Math.sqrt(Math.log(k.s / DEEP.first));
        x0 = Math.min(x0, k.x - r); y0 = Math.min(y0, k.y - r); x1 = Math.max(x1, k.x + r); y1 = Math.max(y1, k.y + r);
        pooled[n * 3] = k.x * s; pooled[n * 3 + 1] = k.y * s; pooled[n * 3 + 2] = k.s;
        n++;
      }
      x0 = Math.max(0, Math.floor(x0 * s)); y0 = Math.max(0, Math.floor(y0 * s)); x1 = Math.min(W, Math.ceil(x1 * s)); y1 = Math.min(plateH, Math.ceil(y1 * s));
      if (n && x1 > x0 && y1 > y0) {
        gl.useProgram(dp.p);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, plate.tex);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, gas.tex);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(dp.u('uSky'), 0);
        gl.uniform1i(dp.u('uDeep'), 1);
        gl.uniform1i(dp.u('uGas'), 2);
        gl.uniform2f(dp.u('uGasInv'), gasG / (s * gasW), gasG / (s * gasH));
        gl.uniform1i(dp.u('uDrop'), H - plateH);
        gl.uniform3fv(dp.u('uPool'), pooled);
        gl.uniform1i(dp.u('uPools'), n);
        gl.uniform1f(dp.u('uReach'), reach * s);
        gl.uniform1f(dp.u('uSoft'), DEEP.soft);
        gl.uniform2f(dp.u('uCap'), DEEP_CAP[0], DEEP_CAP[1]);
        gl.uniform1i(dp.u('uAdd'), add ? 1 : 0);
        gl.blendColor(DEEP_CAP[0], DEEP_CAP[0], DEEP_CAP[1], 1);
        gl.blendFuncSeparate(gl.CONSTANT_COLOR, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        rect(dp, x0, y0, x1, y1);
      }
    }
    draws++;
    stats.skyFrameMs = performance.now() - t0;
    stats.skyDraws = draws;
  };

  const key = (t: number) => {
    const m = meteorNow(t);
    if (clock.isFrozen()) return `f${t}`;
    if (m) return `m${t}`;
    const k = still ? 'still' : `t${Math.floor(t * TWINKLE.hz)}`;
    return pools.length ? `${k}:${mark}` : k;
  };

  init();
  build();

  let picture: HTMLCanvasElement | null = null, unliven: (() => void) | null = null;
  const seen = new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; });
  seen.observe(host);
  const off = clock.onFrame((t) => {
    if (!alive || !visible || gl.isContextLost()) return;
    if (pointer && current) {
      pools = pointer.step(t, current);
      mark = 0;
      for (const k of pools) mark = (Math.imul(mark, 31) + Math.round(k.x * 2) * 7919 + Math.round(k.y * 2) * 104729 + Math.round(k.s * 512)) | 0;
    }
    const k = key(t);
    if (k === last && !dirty) return;
    last = k;
    dirty = false;
    draw(t);
    if (keep) {
      // Read in the same task it was drawn in, before the drawing buffer is given to the page and cleared.
      picture = document.createElement('canvas');
      picture.width = W;
      picture.height = H;
      picture.setAttribute('aria-hidden', 'true');
      picture.style.cssText = canvas.style.cssText;
      picture.getContext('2d')?.drawImage(canvas, 0, 0);
      host.appendChild(picture);
      if (!reduced && current) unliven = liven(host, falls, brightest, current.u);
      alive = false;
      off();
      seen.disconnect();
      sweep(gl);
      canvas.remove();
    }
  });

  const lost = (e: Event) => { e.preventDefault(); sky = null; plate = null; gas = null; };
  const restored = () => { init(); build(); };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);

  let fired = 0;
  const fire = () => { if (falls.length) forced = { at: clock.now(), m: falls[fired++ % falls.length] }; dirty = true; };
  registry.tool('skyMeteor', fire);
  registry.tool('skyMeteors', () => falls.slice(0, 20));
  registry.tool('skyPlan', () => current);
  // Where the cluster and the far galaxies are, in CSS pixels of the host.
  registry.tool('skyFinds', () => current && { cluster: clusterAt(current), far: farGalaxies(current, 1).map((m) => ({ at: m.at, long: m.long, flat: m.flat, turn: m.turn, tone: m.tone })) });
  // Holds the reveal at one place of the host, in CSS pixels, as deep as given. With nothing, lets it go.
  registry.tool('skyDeep', (x?: number, y?: number, depth = 1) => { pointer?.pin(x === undefined || y === undefined ? null : { x, y, s: depth }); dirty = true; });
  // Frame times, each made to wait for the graphics card: n frames with the bright few only, and n with a meteor.
  registry.tool('skyBench', (n = 60) => {
    const time = (fn: (i: number) => void) => { sync(); const t0 = performance.now(); for (let i = 0; i < n; i++) { fn(i); sync(); } return (performance.now() - t0) / n; };
    const keep = forced;
    forced = null;
    const quiet = time((i) => draw(1 + i / 60));
    const m = falls[0];
    forced = m ? { at: 0, m } : null;
    const lit = time((i) => draw((m ? m.dur * 0.6 : 0) + i * 0.001));
    forced = keep;
    sync();
    const t0 = performance.now();
    build();
    sync();
    return { quiet, meteor: lit, build: performance.now() - t0, size: [W, H] };
  });

  return {
    replan() { if (alive && !gl.isContextLost()) build(); },
    meteor: fire,
    dispose() {
      alive = false;
      off();
      seen.disconnect();
      pointer?.dispose();
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      sweep(gl);
      canvas.remove();
      if (picture) { picture.width = 0; picture.height = 0; picture.remove(); picture = null; }
      unliven?.();
    },
  };
}

