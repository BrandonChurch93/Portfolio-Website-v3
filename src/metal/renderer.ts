import { LAMP } from '../config/site';
import { registry, stats } from '../hooks/registry';
import { lamp } from '../lamp/lamp';
import { clock } from '../world/clock';
import { tiers } from '../world/tier';
import { CONTROL_RING, FACE, FACE_LIT, FINISHES, GLOW, INK, RAMP } from './finishes';
import { MASK_FONTS, paintMask, type Mask, type PlateSpec } from './mask';
import { distanceField } from './sdf';
import { BAKE, LIGHT, LIGHT_CARD, VERT } from './shaders';

export interface PlatePhoto {
  src: string; // an image URL, or a video URL when video is true
  video?: boolean;
  focus?: [number, number]; // which part of the picture stays in view when it is cropped, 0 to 1
  zoom?: number; // 1 covers the window; more crops in further around the focus
  // A card's loop: a short video of the same view, played in place of the picture while the card is awake. Its first
  // frame should be the picture, so nothing jumps when it starts.
  loop?: string;
}

// How a card's picture gets its own colors back as the card wakes: all at once, behind a soft edge that crosses it,
// or its lights first. push: how far the picture comes closer while the card is awake, as a share of its size.
export type PlateReveal = 'fade' | 'sweep' | 'lights';
const REVEALS: Record<PlateReveal, number> = { fade: 0, sweep: 1, lights: 2 };
export interface PlateLook { reveal?: PlateReveal; push?: number }

export interface PlateEntry {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  spec: PlateSpec;
  photo?: PlatePhoto;
  look?: PlateLook;
  onState?: (state: 'ready' | 'failed') => void;
}

interface Plate extends PlateEntry {
  ctx: CanvasRenderingContext2D;
  cssW: number;
  cssH: number;
  dpr: number;
  mask: Mask | null;
  b0: WebGLTexture | null;
  b1: WebGLTexture | null;
  photoTex: WebGLTexture | null;
  photoAspect: number;
  videoEl: HTMLVideoElement | null;
  loopEl: HTMLVideoElement | null;
  loopTex: WebGLTexture | null;
  // A card turns as one thing, words and all: the element that holds both is turned, not the plate's own canvas.
  area: HTMLElement | null;
  visible: boolean;
  bakeGen: number;
  sig: string;
  tilt: { x: number; y: number; gx: number; gy: number };
  stream: { x: number; y: number; z: number; k: number };
  // The pointer is on the plate or it has focus: v runs 0 to 1 toward goal. pointer is where it is, CSS px in the plate.
  hover: { v: number; goal: number; pinned: boolean };
  pointer: { x: number; y: number };
  hovered: string;
  seed: number;
  // How many times it has been baked, and how far a strike of the stream has warmed a card's picture toward its
  // own colors.
  baked: number;
  warm: number;
  // Whether it is to be drawn at all. A card that is waiting behind another keeps its bake and is not lit.
  shown: boolean;
}

// A card's relief as it was baked, read back out so that something else can light it too: the stream lays its own
// light on a card from this. Two pictures, bottom row first, as wide and as tall as the card in device pixels.
// Cards of one size and edge bake alike and share a key, and the pictures are left out for a key already held.
export interface CardBake {
  key: string;
  w: number;
  h: number;
  b0: Uint8Array | null;   // normal x, normal y, cavity, wear
  b1: Uint8Array | null;   // second metal, face, grime, roughness
  mask: Mask;
}

type GL = WebGL2RenderingContext;

// A plate's scratches and patina come from its own words, so the same plate always looks the same.
function seedOf(spec: PlateSpec): number {
  const s = [spec.finish, spec.kind, spec.label, spec.big, spec.facts].join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 1 + ((h >>> 0) % 10000) / 997;
}

function compile(gl: GL, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`metal shader: ${gl.getShaderInfoLog(s)}`);
  return s;
}

function program(gl: GL, frag: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`metal program: ${gl.getProgramInfoLog(p)}`);
  const u = new Map<string, WebGLUniformLocation | null>();
  return { p, u: (name: string) => { if (!u.has(name)) u.set(name, gl.getUniformLocation(p, name)); return u.get(name)!; } };
}

function texture(gl: GL, w: number, h: number, internal: number, format: number, type: number, data: ArrayBufferView | null, filter: number): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

// Seconds for the pointer's light to come up, and to go once the pointer has left.
const HOVER = { rise: 0.5, fall: 0.2 };
// A card wakes quicker than a button's light comes up: its picture changing is a bigger event, and it must not drag.
const WAKE = { rise: 0.3, fall: 0.22 };

const DESIGN_MM = { thick: 3.4, bevel: 5.2, cutDepth: 1.7, cutWall: 0.95, panelDepth: 2.4, raise: 2.4, windowDepth: 20 };

// The one plate renderer: a single WebGL2 context, off the page, that draws every plate and copies it to the plate's
// own canvas. Plates bake once per size and redraw only when the lamp, their place in the viewport, the stream or
// their tilt changed.
class PlateRenderer {
  private gl: GL | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private bake: ReturnType<typeof program> | null = null;
  private light: ReturnType<typeof program> | null = null;
  private lightCard: ReturnType<typeof program> | null = null;
  private quad: WebGLVertexArrayObject | null = null;
  private plates = new Set<Plate>();
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private byHost = new Map<Element, Plate>();
  private started = false;
  private still = false;
  private odd = false;
  private broken = false;
  private fontsReady: Promise<unknown> | null = null;
  frameMs = 0;

  private init(): boolean {
    if (this.gl) return true;
    if (this.broken || typeof document === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 4;
      const gl = c.getContext('webgl2', { premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true, alpha: true, powerPreference: 'high-performance' });
      if (!gl) throw new Error('no webgl2');
      if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) { /* the bake writes RGBA8 only; floats are only read */ }
      this.gl = gl;
      this.glCanvas = c;
      this.bake = program(gl, BAKE);
      this.light = program(gl, LIGHT);
      this.lightCard = program(gl, LIGHT_CARD);
      this.quad = gl.createVertexArray();
      gl.bindVertexArray(this.quad);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost(); });
      this.io = new IntersectionObserver((entries) => {
        for (const en of entries) { const p = this.byHost.get(en.target); if (p) { p.visible = en.isIntersecting; p.sig = ''; } }
      }, { rootMargin: '300px 0px' });
      this.ro = new ResizeObserver((entries) => {
        for (const en of entries) { const p = this.byHost.get(en.target); if (p) this.measure(p); }
      });
      this.fontsReady = Promise.all(MASK_FONTS.map((f) => document.fonts.load(f))).catch(() => undefined);
      return true;
    } catch {
      this.broken = true;
      this.gl = null;
      return false;
    }
  }

  private lost(): void {
    this.broken = true;
    for (const p of this.plates) p.onState?.('failed');
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    clock.onFrame((_t, dt) => this.frame(dt));
    tiers.subscribe(() => { for (const p of this.plates) this.measure(p); });
    registry.onFreeze((t) => (t === null ? this.resumeVideos() : this.seekVideos(t)));
    // Test hook: hold a plate as hovered by v, 0 to 1, with the pointer at x, y (CSS px in the plate).
    registry.tool('plateHover', ((selector: string, v: number, x = 0, y = 0) => {
      const el = document.querySelector(selector);
      const host = el?.matches('[data-kind]') ? el : el?.querySelector('[data-kind]');
      const p = host ? this.byHost.get(host) : undefined;
      if (!p) throw new Error(`plateHover: no plate at ${selector}`);
      p.hover = { v, goal: v, pinned: true };
      p.pointer = { x, y };
      p.sig = '';
    }) as (...args: never[]) => unknown);
  }

  add(entry: PlateEntry): () => void {
    if (!this.init()) { entry.onState?.('failed'); return () => undefined; }
    const ctx = entry.canvas.getContext('2d');
    if (!ctx) { entry.onState?.('failed'); return () => undefined; }
    const p: Plate = {
      ...entry, ctx, cssW: 0, cssH: 0, dpr: 1, mask: null, b0: null, b1: null, photoTex: null, photoAspect: 1, videoEl: null, loopEl: null, loopTex: null,
      area: entry.spec.kind === 'card' ? entry.host.closest<HTMLElement>('[data-plate-area]') : null,
      visible: false, bakeGen: 0, sig: '', tilt: { x: 0, y: 0, gx: 0, gy: 0 }, stream: { x: 0, y: 0, z: 26, k: 0 },
      hover: { v: 0, goal: 0, pinned: false }, pointer: { x: 0, y: 0 }, hovered: '',
      seed: seedOf(entry.spec), baked: 0, warm: 0, shown: true,
    };
    this.plates.add(p);
    this.byHost.set(entry.host, p);
    this.io!.observe(entry.host);
    this.ro!.observe(entry.host);
    if (entry.photo) this.loadPhoto(p, entry.photo);
    this.measure(p);
    this.start();
    return () => this.remove(p);
  }

  private remove(p: Plate): void {
    this.plates.delete(p);
    this.byHost.delete(p.host);
    this.io?.unobserve(p.host);
    this.ro?.unobserve(p.host);
    const gl = this.gl;
    if (gl) { if (p.b0) gl.deleteTexture(p.b0); if (p.b1) gl.deleteTexture(p.b1); if (p.photoTex) gl.deleteTexture(p.photoTex); if (p.loopTex) gl.deleteTexture(p.loopTex); }
    p.videoEl?.pause();
    p.loopEl?.pause();
    p.bakeGen++;
  }

  // Tilt toward the cursor, a few degrees, eased in frame().
  setTilt(host: Element, x: number, y: number): void {
    const p = this.byHost.get(host);
    if (p && !(this.still && p.area)) { p.tilt.gx = x; p.tilt.gy = y; }
  }

  // The pointer is on a plate (or it has focus), or has left. x and y are where it is, CSS px in the plate.
  setHover(host: Element, on: boolean, x = 0, y = 0): void {
    const p = this.byHost.get(host);
    if (!p) return;
    if (on && p.hover.goal === 0) { p.pointer.x = x; p.pointer.y = y; }
    p.hover.goal = on ? 1 : 0;
  }

  setPointer(host: Element, x: number, y: number): void {
    const p = this.byHost.get(host);
    if (p) { p.pointer.x = x; p.pointer.y = y; }
  }

  // The stream near a plate: where it is (viewport CSS px) and how much it lights it, 0 to 1.
  setStream(host: Element, x: number, y: number, k: number): void {
    const p = this.byHost.get(host);
    if (p) { p.stream.x = x; p.stream.y = y; p.stream.k = k; }
  }

  // How far a strike of the stream has warmed a card's picture toward its own colors, 0 to 1.
  setWarm(host: Element, v: number): void {
    const p = this.byHost.get(host);
    if (!p || p.warm === v) return;
    p.warm = v;
    // A frozen clock draws each frame once, and the plates before the stream: the card is drawn again here, so a
    // frozen frame shows the warmth of its own moment and not of the one before.
    if (clock.isFrozen() && p.visible && p.mask) this.draw(p, false);
  }

  // Whether a plate is to be drawn. One that is hidden behind another keeps everything it has and costs nothing.
  setShown(host: Element, on: boolean): void {
    const p = this.byHost.get(host);
    if (!p || p.shown === on) return;
    p.shown = on;
    p.sig = '';
    if (on && clock.isFrozen() && p.visible && p.mask) this.draw(p, false);
  }

  // A card as it is this frame: how it is turned, in radians as its page turns it, how awake it is, and how many
  // times it has been baked.
  cardOf(host: Element): { turnX: number; turnY: number; awake: number; baked: number } | null {
    const p = this.byHost.get(host);
    return p && p.area ? { turnX: p.tilt.x, turnY: p.tilt.y, awake: p.hover.v, baked: p.baked } : null;
  }

  // A card's relief, read back out of its last bake. held says which keys the asker has already.
  bakeOf(host: Element, held: (key: string) => boolean): CardBake | null {
    const p = this.byHost.get(host), gl = this.gl;
    if (!p || !gl || !p.mask || !p.b0 || !p.b1 || !p.baked) return null;
    const { w, h } = p.mask, key = `${w}:${h}:${p.mask.strip ? p.mask.strip[3] : 0}:${p.mask.deep ? 1 : 0}:${p.seed}`;
    if (held(key)) return { key, w, h, b0: null, b1: null, mask: p.mask };
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const take = (t: WebGLTexture) => {
      const out = new Uint8Array(w * h * 4);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
      return out;
    };
    const b0 = take(p.b0), b1 = take(p.b1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    return { key, w, h, b0, b1, mask: p.mask };
  }

  private loadPhoto(p: Plate, photo: PlatePhoto): void {
    if (photo.video) {
      const v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.crossOrigin = 'anonymous';
      v.src = photo.src;
      p.videoEl = v;
      registry.track(new Promise<void>((resolve) => {
        v.addEventListener('loadeddata', () => { p.photoAspect = v.videoWidth / v.videoHeight || 16 / 9; resolve(); }, { once: true });
        v.addEventListener('error', () => resolve(), { once: true });
      }));
      v.play().catch(() => undefined);
      return;
    }
    if (photo.loop) {
      // Only its size and length are fetched until the card first wakes.
      const v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'metadata';
      v.crossOrigin = 'anonymous';
      v.src = photo.loop;
      p.loopEl = v;
    }
    const im = new Image();
    im.decoding = 'async';
    im.src = photo.src;
    registry.track(im.decode().then(() => {
      const gl = this.gl;
      if (!gl) return;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const ext = gl.getExtension('EXT_texture_filter_anisotropic');
      if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      p.photoTex = t;
      p.photoAspect = im.naturalWidth / im.naturalHeight;
      p.sig = '';
    }).catch(() => undefined));
  }

  private measure(p: Plate): void {
    const r = p.host.getBoundingClientRect();
    // Plates keep crisp words: the device's own ratio up to 3x, and never under 2x, because at 1x the cut walls of
    // small letters swallow their strokes. On a 1x screen the browser scales the plate down, which smooths it.
    // The low tier caps at 2x. Plates redraw only on change.
    const dpr = Math.min(Math.max(devicePixelRatio || 1, 2), tiers.get() === 'low' ? 2 : 3);
    const cssW = Math.round(r.width * 100) / 100;
    const cssH = Math.round(r.height * 100) / 100;
    if (cssW < 4 || cssH < 4) return;
    if (cssW === p.cssW && cssH === p.cssH && dpr === p.dpr && p.mask) return;
    p.cssW = cssW;
    p.cssH = cssH;
    p.dpr = dpr;
    const gen = ++p.bakeGen;
    registry.track(this.rebake(p, gen));
  }

  private async rebake(p: Plate, gen: number): Promise<void> {
    await this.fontsReady;
    if (gen !== p.bakeGen || !this.gl) return;
    const mask = paintMask(p.spec, p.cssW, p.cssH, p.dpr);
    const rg = await distanceField(mask.glyphs, mask.panel, mask.w, mask.h);
    if (gen !== p.bakeGen || !this.gl) return;
    const gl = this.gl;
    const sdf = texture(gl, mask.w, mask.h, gl.RG16F, gl.RG, gl.FLOAT, rg, gl.LINEAR);
    if (p.b0) gl.deleteTexture(p.b0);
    if (p.b1) gl.deleteTexture(p.b1);
    p.b0 = texture(gl, mask.w, mask.h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.LINEAR);
    p.b1 = texture(gl, mask.w, mask.h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.LINEAR);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, p.b0, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, p.b1, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    const b = this.bake!;
    gl.useProgram(b.p);
    gl.bindVertexArray(this.quad);
    gl.viewport(0, 0, mask.w, mask.h);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sdf);
    gl.uniform1i(b.u('uSdf'), 0);
    this.common(b, p, mask);
    const F = FINISHES[p.spec.finish];
    const S = mask.S;
    gl.uniform1i(b.u('uFinish'), F.id);
    gl.uniform1f(b.u('uThick'), DESIGN_MM.thick * S);
    // A card's bead is rubbed bright along its crest, which is half way across it.
    gl.uniform1f(b.u('uBevel'), mask.bead ? mask.bead * (mask.deep ? 0.53 : 0.588) : DESIGN_MM.bevel * S);
    // Fine lettering at low pixel density gets a shallower cut, so its shading does not thicken or double the strokes.
    gl.uniform1f(b.u('uCutDepth'), DESIGN_MM.cutDepth * S * Math.min(1, Math.max(0.45, (S - 0.35) / 1.3)));
    gl.uniform1f(b.u('uCutWall'), Math.max(0.55, DESIGN_MM.cutWall * S));
    gl.uniform1f(b.u('uPanelDepth'), DESIGN_MM.panelDepth * S);
    gl.uniform1f(b.u('uRaise'), DESIGN_MM.raise * S);
    gl.uniform1f(b.u('uGrain'), p.spec.kind === 'control' && F.pillow === undefined ? Math.max(F.grain, 0.05) : F.grain);
    gl.uniform1f(b.u('uPatina'), F.patina);
    gl.uniform1f(b.u('uScratch'), F.scratch * (p.spec.kind === 'control' ? 0.25 : 1));
    gl.uniform1f(b.u('uPillow'), p.spec.kind === 'control' ? (F.pillow ?? 5) * S : 0);
    gl.uniform1f(b.u('uRimW'), p.spec.kind === 'control' ? F.rimW ?? 64 : p.spec.kind === 'card' ? 0.6 : 64);
    gl.uniform1f(b.u('uFaceClean'), p.spec.kind === 'control' ? F.faceClean ?? 0 : 0);
    gl.uniform1f(b.u('uSeed'), p.seed);
    gl.uniform1f(b.u('uRim'), mask.deep ? 1 : 0);
    const strip = mask.strip ?? [0, 0, 0, 0];
    gl.uniform4f(b.u('uStrip'), strip[0], strip[1], strip[2], strip[3]);
    const sc = new Float32Array(24);
    mask.screws.slice(0, 6).forEach((s, i) => sc.set(s, i * 4));
    gl.uniform4fv(b.u('uScrew'), sc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(sdf);
    p.mask = mask;
    p.baked++;
    p.canvas.width = mask.w;
    p.canvas.height = mask.h;
    p.sig = '';
    if (this.glCanvas!.width < mask.w || this.glCanvas!.height < mask.h) {
      this.glCanvas!.width = Math.max(this.glCanvas!.width, mask.w);
      this.glCanvas!.height = Math.max(this.glCanvas!.height, mask.h);
    }
    this.draw(p, true);
    p.onState?.('ready');
  }

  private common(prog: ReturnType<typeof program>, p: Plate, mask: Mask): void {
    const gl = this.gl!;
    gl.uniform2f(prog.u('uRes'), mask.w, mask.h);
    gl.uniform1f(prog.u('uS'), mask.S);
    gl.uniform1f(prog.u('uRad'), mask.radius);
    gl.uniform1f(prog.u('uInset'), 1.5 * mask.S);
    const win = mask.win ?? [0, 0, 1, 1];
    gl.uniform4f(prog.u('uWin'), win[0], win[1], win[2], win[3]);
    gl.uniform1f(prog.u('uWinOn'), mask.win ? 1 : 0);
    gl.uniform1f(prog.u('uWinR'), mask.winR);
    gl.uniform1f(prog.u('uWinRb'), mask.winRb);
    gl.uniform1f(prog.u('uWinDepth'), (mask.winDepth || DESIGN_MM.windowDepth) * mask.S);
    gl.uniform1f(prog.u('uBead'), mask.bead);
    gl.uniform1f(prog.u('uBezel'), mask.bezel);
  }

  private frame(dt = 0): void {
    if (!this.gl || this.broken) return;
    const t0 = performance.now();
    const frozen = clock.isFrozen();
    const k = frozen ? 1 : 0.14;
    // Every plate's place is read before anything is written, so the page lays out once a frame, not once a plate.
    const rects = new Map<Plate, DOMRect>();
    for (const p of this.plates) if (p.visible && p.mask && p.shown) rects.set(p, p.host.getBoundingClientRect());
    for (const p of this.plates) {
      const dx = p.tilt.gx - p.tilt.x;
      const dy = p.tilt.gy - p.tilt.y;
      if (Math.abs(dx) + Math.abs(dy) > 1e-5) {
        p.tilt.x += dx * k;
        p.tilt.y += dy * k;
        // A button leans in its light only. Turning its canvas as well moved it under half a pixel and softened its words.
        if (p.area) {
          p.area.style.setProperty('--turn-x', `${(p.tilt.x * 57.2958).toFixed(3)}deg`);
          p.area.style.setProperty('--turn-y', `${(p.tilt.y * 57.2958).toFixed(3)}deg`);
        } else if (p.spec.kind !== 'control') p.canvas.style.transform = `rotateX(${(p.tilt.x * 57.2958).toFixed(3)}deg) rotateY(${(p.tilt.y * 57.2958).toFixed(3)}deg)`;
      }
    }
    // The light comes up as the pointer arrives and goes quickly when it leaves. A frozen clock shows it whole.
    for (const p of this.plates) {
      const h = p.hover;
      if (h.pinned || h.v === h.goal) continue;
      if (frozen || this.still) h.v = h.goal;
      else {
        const T = p.spec.kind === 'card' ? WAKE : HOVER;
        h.v = h.goal > h.v ? Math.min(h.goal, h.v + dt / T.rise) : Math.max(h.goal, h.v - dt / T.fall);
      }
    }
    // A card's loop plays while the card is awake, and goes back to its first frame once the card is at rest again.
    // A frozen clock seeks it instead (seekVideos).
    if (!frozen) for (const p of this.plates) {
      const v = p.loopEl;
      if (!v) continue;
      // Once the card is on screen the rest of the loop may be fetched, so it starts at once when the card wakes.
      if (p.visible && v.preload !== 'auto' && !this.still) v.preload = 'auto';
      const want = p.hover.goal > 0 && p.visible && !this.still;
      if (want && v.paused) v.play().catch(() => undefined);
      else if (!want && !v.paused && p.hover.v === 0) { v.pause(); v.currentTime = 0; }
    }
    // On a screen that draws more than about ninety frames a second, a card that is at rest is lit again on every
    // other frame, half the cards on each: the lamp's light on it is still followed sixty times a second, and the
    // cost of lighting four cards a frame is halved. A card that is awake, turning or warming is lit every frame.
    const quick = dt > 0 && dt < 0.011;
    this.odd = !this.odd;
    let nth = 0;
    for (const [p, r] of rects) {
      if (quick && p.area && p.sig && p.hover.v === 0 && p.hover.goal === 0 && p.warm === 0 && Math.abs(p.tilt.x) + Math.abs(p.tilt.y) < 1e-4 && (nth++ % 2 === 0) === this.odd) continue;
      this.draw(p, false, r);
    }
    this.frameMs = performance.now() - t0;
    stats.metalMs = this.frameMs;
    stats.plates = this.plates.size;
  }

  private draw(p: Plate, force: boolean, rect?: DOMRect): void {
    const gl = this.gl!;
    const mask = p.mask!;
    const r = rect ?? p.host.getBoundingClientRect();
    const L = lamp.get();
    const video = p.videoEl && p.videoEl.readyState >= 2;
    const loop = !!p.loopEl && p.loopEl.readyState >= 2 && p.hover.v > 0 && !this.still;
    const sig = [Math.round(L.px), Math.round(L.py), Math.round(r.left), Math.round(r.top), clock.view.w, clock.view.h,
      p.tilt.x.toFixed(3), p.tilt.y.toFixed(3), p.stream.k.toFixed(3), Math.round(p.stream.x), Math.round(p.stream.y), p.hover.v.toFixed(3), p.warm.toFixed(3), !!p.photoTex,
      p.hover.v > 0 ? `${Math.round(p.pointer.x)}:${Math.round(p.pointer.y)}` : '',
      video ? p.videoEl!.currentTime.toFixed(3) : '', loop ? p.loopEl!.currentTime.toFixed(3) : ''].join();
    if (!force && sig === p.sig) return;
    // The static tier does not follow the lamp, but a plate still answers the pointer or focus on it.
    const hovered = `${p.hover.v.toFixed(3)}:${Math.round(p.pointer.x)}:${Math.round(p.pointer.y)}`;
    if (tiers.get() === 'static' && p.sig && !force && hovered === p.hovered) return;
    p.hovered = hovered;
    p.sig = sig;
    if (video) this.uploadVideo(p);
    if (loop) p.loopTex = this.uploadFrame(p.loopEl!, p.loopTex);
    const card = p.spec.kind === 'card';
    const l = card ? this.lightCard! : this.light!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(l.p);
    gl.bindVertexArray(this.quad);
    gl.viewport(0, 0, mask.w, mask.h);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, p.b0); gl.uniform1i(l.u('uB0'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, p.b1); gl.uniform1i(l.u('uB1'), 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, p.photoTex ?? p.b0); gl.uniform1i(l.u('uPhoto'), 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, loop && p.loopTex ? p.loopTex : p.b0); gl.uniform1i(l.u('uLoop'), 3);
    gl.uniform1f(l.u('uLoopOn'), loop && p.loopTex ? 1 : 0);
    this.common(l, p, mask);
    gl.uniform1f(l.u('uDpr'), p.dpr);
    gl.uniform2f(l.u('uOrigin'), r.left, r.top);
    gl.uniform2f(l.u('uView'), clock.view.w, clock.view.h);
    gl.uniform3f(l.u('uLamp'), L.px, L.py, LAMP.depth * Math.max(clock.view.w, clock.view.h * 0.8));
    gl.uniform1f(l.u('uLampI'), 1.15 + 0.3 * L.led);
    // A portrait's glass glares softly: the lamp's spot should not sit on a face.
    // A card's glass throws no glare back: a spot or a streak of light crossing the picture read as decoration.
    gl.uniform1f(l.u('uGlare'), p.spec.kind === 'frame' ? 0.06 : card ? 0 : 1);
    gl.uniform1f(l.u('uCard'), card ? 1 : 0);
    gl.uniform1i(l.u('uReveal'), card ? REVEALS[p.look?.reveal ?? 'fade'] : 0);
    gl.uniform1f(l.u('uPush'), card ? p.look?.push ?? 0 : 0);
    gl.uniform1f(l.u('uWarm'), card ? p.warm : 0);
    gl.uniform1f(l.u('uRimH'), mask.bead * (mask.deep ? 0.42 : 0.5));
    if (card) {
      gl.uniform3fv(l.u('uFace'), FACE);
      gl.uniform3fv(l.u('uFaceLit'), FACE_LIT);
      gl.uniform3fv(l.u('uRamp'), RAMP);
    }
    gl.uniform3f(l.u('uStream'), p.stream.x, p.stream.y, p.stream.z);
    gl.uniform1f(l.u('uStreamI'), p.stream.k * 8.0);
    // A card is turned on the page as well as in its light, and the page's y runs down where the light's runs up:
    // the turn about x has to change sign for the two to agree.
    gl.uniform2f(l.u('uTilt'), p.area ? -p.tilt.x : p.tilt.x, p.tilt.y);
    // Arriving, it eases at both ends. Leaving, most of the light is gone at once and the last of it tails off.
    const hv = p.hover.v;
    gl.uniform1f(l.u('uHover'), p.hover.goal >= hv ? hv * hv * (3 - 2 * hv) : hv * hv * hv);
    gl.uniform3fv(l.u('uGlow'), GLOW);
    gl.uniform1f(l.u('uRing'), p.spec.kind === 'control' ? CONTROL_RING : 0);
    gl.uniform1f(l.u('uSoft'), p.spec.kind === 'control' ? FINISHES[p.spec.finish].soft ?? 0 : 0);
    gl.uniform1f(l.u('uInlay'), p.spec.kind === 'control' ? FINISHES[p.spec.finish].inlay ?? 0 : 0);
    gl.uniform2f(l.u('uPointer'), p.pointer.x * p.dpr, p.pointer.y * p.dpr);
    gl.uniform1f(l.u('uBand'), p.spec.kind === 'control' ? FINISHES[p.spec.finish].band ?? 1 : 1);
    gl.uniform1f(l.u('uCoat'), p.spec.kind === 'control' ? FINISHES[p.spec.finish].coat ?? 0 : 0);
    const F = FINISHES[p.spec.finish];
    gl.uniform3fv(l.u('uF0a'), F.a);
    gl.uniform3fv(l.u('uF0b'), F.b);
    gl.uniform3fv(l.u('uInk'), INK);
    gl.uniform1f(l.u('uRa'), F.ra);
    gl.uniform1f(l.u('uRb'), F.rb);
    gl.uniform1f(l.u('uAniso'), F.aniso);
    gl.uniform1f(l.u('uPhotoAspect'), p.photoAspect);
    gl.uniform1f(l.u('uPhotoOn'), p.photoTex ? 1 : 0);
    const focus = p.photo?.focus ?? [0.5, 0.3];
    gl.uniform2f(l.u('uPhotoFocus'), focus[0], focus[1]);
    gl.uniform1f(l.u('uPhotoZoom'), p.photo?.zoom ?? 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    p.ctx.clearRect(0, 0, mask.w, mask.h);
    p.ctx.drawImage(this.glCanvas!, 0, this.glCanvas!.height - mask.h, mask.w, mask.h, 0, 0, mask.w, mask.h);
    p.host.style.setProperty('--lamp-dx', ((r.left + r.width / 2 - L.px) / clock.view.w).toFixed(3));
    p.host.style.setProperty('--lamp-dy', ((r.top + r.height / 2 - L.py) / clock.view.h).toFixed(3));
  }

  private uploadVideo(p: Plate): void {
    p.photoTex = this.uploadFrame(p.videoEl!, p.photoTex);
  }

  private uploadFrame(v: HTMLVideoElement, tex: WebGLTexture | null): WebGLTexture {
    const gl = this.gl!;
    let t = tex;
    if (!t) {
      t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
    return t;
  }

  // Frozen clock: the video shows the frame at t, so a shot of it is repeatable.
  async seekVideos(t: number): Promise<void> {
    const waits: Promise<void>[] = [];
    for (const p of this.plates) {
      for (const v of [p.videoEl, p.hover.goal > 0 ? p.loopEl : null]) {
        if (!v) continue;
        if (!v.duration) {
          // A loop that has not been asked for yet has only its size: fetch it, then show the frame.
          if (v !== p.loopEl) continue;
          v.preload = 'auto';
          waits.push(new Promise((res) => { v.addEventListener('loadeddata', () => res(), { once: true }); v.addEventListener('error', () => res(), { once: true }); v.load(); }));
          continue;
        }
        v.pause();
        const target = t % v.duration;
        if (Math.abs(v.currentTime - target) < 1e-3) continue;
        waits.push(new Promise((res) => { v.addEventListener('seeked', () => res(), { once: true }); v.currentTime = target; }));
      }
    }
    await Promise.all(waits);
    for (const p of this.plates) p.sig = '';
  }

  resumeVideos(): void {
    for (const p of this.plates) p.videoEl?.play().catch(() => undefined);
  }

  count(): number {
    return this.plates.size;
  }
}

export const plates = new PlateRenderer();
