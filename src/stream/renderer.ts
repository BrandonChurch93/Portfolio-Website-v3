import { hex, type PaletteName } from '../config/palette';
import { COPPER, COPPER_LIGHT, FINISHES } from '../metal/finishes';
import { STREAM, type StreamBudget } from './config';
import * as G from './shaders';
import { COPPER_FRAG, glassFrag } from './shaders-first';
import { FACET_KINDS, FIRST_KINDS, VERTEX_FLOATS, type Look, type ShardMeshes } from './shards';
import { STONE } from './stone';

// Draws the stream. In order: the light, as amounts, into its own buffer. The glow, by making that buffer smaller
// step by step and building it back up. Then the picture: the solid shards behind the core, the light, the title and
// the card, the solid shards in front, and last the clear ones, which redraw what is behind them. Then all of it onto
// the page.

type GL = WebGL2RenderingContext;

export const INSTANCE_FLOATS = 16;
export const CORE_FLOATS = 5;
export const STREAK_FLOATS = 5;
// Shards are drawn in three lots, each sorted by kind: solid ones behind the core, solid ones in front, clear ones.
export const LAYERS = 3;
export const KINDS = Math.max(FACET_KINDS, FIRST_KINDS);
// Where each look's meshes begin, and how many kinds it has: the facets are one family in both materials, the first
// round's copper leaf and glass are two.
const SETS: Record<Look, { solid: [first: number, kinds: number]; clear: [first: number, kinds: number] }> = {
  facets: { solid: [0, FACET_KINDS], clear: [0, FACET_KINDS] },
  first: { solid: [FACET_KINDS, FIRST_KINDS], clear: [FACET_KINDS + FIRST_KINDS, FIRST_KINDS] },
};

export interface TitleField {
  data: Uint8Array;
  w: number;
  h: number;
  rect: [number, number, number, number];
  range: [number, number, number];
}

export interface CardShape { x: number; y: number; hw: number; hh: number; r: number }
// A stone and a rail as they are drawn: where the route has them (route.ts). A stone's own is 1, or -1 for the one
// that is the other in a mirror. A rail's own is a number that moves its marks.
export interface PostShape { x: number; y: number; r: number; own: number }
// blade: a blade's length and half its width, in halves of the rail's thickness. ends: whether its high end has a
// blade and whether its low end has. keel: how far along each of its two brackets is, the same way, and how large
// a bracket is against the rail's own, with no brackets when that is nothing.
export interface RailShape { ax: number; ay: number; bx: number; by: number; half: number; own: number; blade: [number, number]; ends: [number, number]; keel: [number, number, number] }
// A straight piece of something solid that throws a shadow: the line down its middle and half its thickness.
export interface Bar { ax: number; ay: number; bx: number; by: number; half: number }
// A project card as it stands this frame. It is a lit plate of its own in the page, and the stream cuts itself off
// where it stands and lays its light on it. x, y, hw and hh are its box at rest. inset is how far inside that box its
// metal begins and r the radius of its corners. turn maps a point of the card at rest, from its center, to where
// the pointer has turned and grown it to, as a 3 by 3 matrix by columns. tiltX and tiltY are the same turn as
// angles, for its light. bake names its relief (setBake). win is its picture's window, from its center, frame the
// width of the frame round that, rim the width of its edge, and unit one of the card's own design units. flare is
// how hard it has just been struck, and struck where, from its center. there is how much of it is there, 0 to 1:
// a card on its way in or out is only partly there, and cuts the stream off only as much.
export interface PlateCard {
  x: number; y: number; hw: number; hh: number; inset: number; r: number;
  turn: Float32Array; tiltX: number; tiltY: number;
  bake: string; win: [number, number, number, number]; frame: number; rim: number; unit: number; flare: number; struck: [number, number];
  there: number;
}

export interface Frame {
  view: [number, number, number, number];
  time: number;
  unit: number;
  lamp: [number, number, number, number];
  energy: [number, number];
  split: number;                                 // where the two sides part, in units along the route
  end: number;                                   // where the second side's own core ends, if the two meet again
  presence: number;                              // 0 on a narrow screen to 1 on a wide one
  look: Look;
  core: Float32Array;
  coreRuns: [number, number, number, number];   // first vertex and count, for each side
  streaks: Float32Array;
  streakCount: number;
  shards: Float32Array;
  lots: Int32Array;                              // first and count for each layer and kind
  plates?: PlateCard[];                          // the project cards on the page
  lit?: number[];                                // how far each stone's face is lit from inside, 0 to 1
  // The surges running along each side: for each, where along the route its front is (in units), how much brighter
  // it makes the core, and which way it runs. G.SWELLS of them to a side, three numbers each.
  swell?: [Float32Array, Float32Array];
}

const lin = (name: PaletteName): [number, number, number] => {
  const v = hex(name);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => Math.pow(c / 255, 2.2)) as [number, number, number];
};

const GLOW = {
  near: [0.03, 0.08, 0.12, 0.13, 0.08, 0.04, 0.02],
  wide: [0, 0, 0.02, 0.1, 0.3, 0.6, 0.8],
  close: [0, 0.25, 0.5, 0.45, 0.2, 0.05, 0],
  nearGain: 1.8,
  page: 0.2,
  deep: 130,
  // On a wide screen the stream is small against the page, and it is given more presence there, from heat alone: a
  // hotter heart and a little more light on the page. A wider glow was tried and read as a neon tube. More light in
  // the body of the ribbon was tried and hid its fibres. Each number is what is added at full presence.
  more: { page: 0.04, heart: 0.34 },
};

// A shard's vertex, part by part: position, normal, edge distances, tag, and the bevel of each edge.
const MESH = [3, 3, 3, 1, 3, 3, 3];

interface Target { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number }

function compile(gl: GL, vs: string, fs: string, attribs: string[]) {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as [number, string][]) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`stream shader: ${gl.getShaderInfoLog(sh)}`);
    gl.attachShader(p, sh);
  }
  attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`stream program: ${gl.getProgramInfoLog(p)}`);
  const found = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => { if (!found.has(name)) found.set(name, gl.getUniformLocation(p, name)); return found.get(name)!; };
  gl.useProgram(p);
  for (const [name, color] of [['uEmber', 'ember'], ['uFlame', 'flame'], ['uHot', 'hot'], ['uPale', 'pale'], ['uText', 'text'], ['uFace', 'bg-2'], ['uFaceLit', 'bronze-deep']] as [string, PaletteName][]) gl.uniform3fv(u(name), lin(color));
  gl.uniform3fv(u('uF0'), COPPER_LIGHT);
  gl.uniform3fv(u('uCopper'), COPPER);
  // What the buttons' room code reads (src/metal/shaders.ts): the room as it is, with no one soft light in front.
  gl.uniform1f(u('uSoft'), 0);
  gl.uniform1f(u('uBand'), 1);
  return { p, u };
}

type Program = ReturnType<typeof compile>;

export class StreamRenderer {
  readonly ok: boolean;
  private gl: GL;
  private float = false;
  private budget: StreamBudget | null = null;
  private shapes: G.Shapes = { cards: 1, posts: 0, rails: 0 };
  private ends = false;
  private prog: Record<string, Program> = {};
  private quad!: WebGLVertexArrayObject;
  private coreArray!: WebGLVertexArrayObject;
  private coreBuffer!: WebGLBuffer;
  private streakArray!: WebGLVertexArrayObject;
  private streakBuffer!: WebGLBuffer;
  private shardArray!: WebGLVertexArrayObject;
  private shardBuffer!: WebGLBuffer;
  private light: Target | null = null;
  private down: Target[] = [];
  private up: Target[] = [];
  private scene: { fbo: WebGLFramebuffer; color: WebGLRenderbuffer; depth: WebGLRenderbuffer } | null = null;
  private behind: Target | null = null;
  private whole: Target | null = null;
  // How much of each pixel a project card covers, and each card's relief by name.
  private mask: Target | null = null;
  private bakes = new Map<string, { b0: WebGLTexture; b1: WebGLTexture }>();
  // The sun stone's carving.
  private stone: [WebGLTexture, WebGLTexture] | null = null;
  private calm = new Float32Array(G.SWELLS * 3);
  private sdf: WebGLTexture;
  private none: WebGLTexture | null = null;
  private title: TitleField | null = null;
  private cards: CardShape[] = [];
  // The project cards' boxes at rest: they are not drawn here, but they throw shadows in the stream's light.
  private stood: CardShape[] = [];
  private posts: PostShape[] = [];
  private rails: RailShape[] = [];
  private bars: Bar[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private sizes = { core: 0, streaks: 0, shards: 0 };

  constructor(private canvas: HTMLCanvasElement, private meshes: ShardMeshes) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'high-performance' }) as GL | null;
    this.gl = gl as GL;
    this.ok = !!gl;
    this.sdf = gl ? gl.createTexture()! : (null as unknown as WebGLTexture);
    if (!gl) return;
    this.float = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    gl.getExtension('OES_texture_float_linear');

    const fixed = (data: Float32Array) => { const b = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
    this.quad = gl.createVertexArray()!;
    gl.bindVertexArray(this.quad);
    fixed(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const moving = (floats: number, parts: number[]) => {
      const array = gl.createVertexArray()!, buffer = gl.createBuffer()!;
      gl.bindVertexArray(array);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      let at = 0;
      parts.forEach((size, i) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, size, gl.FLOAT, false, floats * 4, at * 4); at += size; });
      return { array, buffer };
    };
    ({ array: this.coreArray, buffer: this.coreBuffer } = moving(CORE_FLOATS, [2, 3]));
    ({ array: this.streakArray, buffer: this.streakBuffer } = moving(STREAK_FLOATS, [2, 3]));

    this.shardArray = gl.createVertexArray()!;
    gl.bindVertexArray(this.shardArray);
    fixed(meshes.data);
    MESH.reduce((at, size, i) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, size, gl.FLOAT, false, VERTEX_FLOATS * 4, at * 4); return at + size; }, 0);
    this.shardBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.shardBuffer);
    for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(MESH.length + i); gl.vertexAttribDivisor(MESH.length + i, 1); }
    gl.bindVertexArray(null);

    gl.bindTexture(gl.TEXTURE_2D, this.sdf);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, 1, 1, 0, gl.RG, gl.UNSIGNED_BYTE, new Uint8Array([255, 255]));
    this.filter(gl.LINEAR);
    this.none = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.none);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    this.filter(gl.NEAREST);
  }

  private filter(mode: number): void {
    const gl = this.gl;
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, mode], [gl.TEXTURE_MAG_FILTER, mode], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  }

  // Programs that depend on the budget, or on how many things stand on the page, are built again when those change.
  // ends: the two sides of the stream meet again.
  configure(budget: StreamBudget, shapes: G.Shapes = { cards: 1, posts: 0, rails: 0 }, ends = false): void {
    const same = this.budget === budget && this.ends === ends && !this.shapes.swell === !shapes.swell && this.shapes.cards === shapes.cards && this.shapes.posts === shapes.posts && this.shapes.rails === shapes.rails && !this.shapes.plates === !shapes.plates && !this.shapes.drawn === !shapes.drawn;
    if (!this.ok || same) return;
    const gl = this.gl, f = this.float;
    for (const old of Object.values(this.prog)) gl.deleteProgram(old.p);
    this.budget = budget;
    this.shapes = shapes;
    this.ends = ends;
    const shard = ['aPos', 'aNormal', 'aEdge', 'aTag', 'aBevel0', 'aBevel1', 'aBevel2', 'iPlace', 'iTurn', 'iCore', 'iMore'];
    this.prog = {
      core: compile(gl, G.CORE_VERT, G.coreFrag(budget.split ? 9 : 7, ends, !!shapes.swell), ['aPos', 'aAlong']),
      streak: compile(gl, G.STREAK_VERT, G.STREAK_FRAG, ['aPos', 'aLight']),
      down: compile(gl, G.FULL_VERT, G.downFrag(f), ['aPos']),
      up: compile(gl, G.FULL_VERT, G.upFrag(f), ['aPos']),
      title: compile(gl, G.RELIEF_VERT, G.titleFrag(f), ['aPos']),
      card: compile(gl, G.RELIEF_VERT, G.cardFrag(f), ['aPos']),
      solid: compile(gl, G.SHARD_VERT, G.SOLID_FRAG, shard),
      clear: compile(gl, G.SHARD_VERT, G.CLEAR_FRAG, shard),
      copper: compile(gl, G.SHARD_VERT, COPPER_FRAG, shard),
      glass: compile(gl, G.SHARD_VERT, glassFrag(budget.split), shard),
      light: compile(gl, G.FULL_VERT, G.lightFrag(f), ['aPos']),
      final: compile(gl, G.FULL_VERT, G.finalFrag(f, shapes), ['aPos']),
    };
    if (shapes.plates) {
      this.prog.hole = compile(gl, G.PLATE_VERT, G.PLATE_HOLE_FRAG, ['aPos']);
      this.prog.plate = compile(gl, G.PLATE_VERT, G.plateLightFrag(f), ['aPos']);
      const C = FINISHES.card, u = this.prog.plate.u;
      gl.uniform3fv(u('uMetalA'), C.a);
      gl.uniform3fv(u('uMetalB'), C.b);
      gl.uniform3f(u('uRough'), C.ra, C.rb, C.aniso);
    }
    if (shapes.posts) {
      this.prog.post = compile(gl, G.RELIEF_VERT, G.stoneFrag(f), ['aPos']);
      if (!this.stone) this.stone = this.carve();
    }
    if (shapes.drawn ?? shapes.rails) this.prog.rail = compile(gl, G.RELIEF_VERT, G.railFrag(f), ['aPos']);
    this.w = 0;
  }

  // The sun stone, carved once into two pictures (stone.ts), with smaller copies of each for drawing it small.
  private carve(): [WebGLTexture, WebGLTexture] {
    const gl = this.gl, size = STONE.size;
    const carver = compile(gl, G.FULL_VERT, G.STONE_BAKE_FRAG, ['aPos']);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const made = [0, 1].map((i) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(size)) + 1, gl.RGBA8, size, size);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
      return t;
    }) as [WebGLTexture, WebGLTexture];
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, size, size);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(carver.p);
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteProgram(carver.p);
    const fine = gl.getExtension('EXT_texture_filter_anisotropic');
    for (const t of made) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.filter(gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (fine) gl.texParameterf(gl.TEXTURE_2D, fine.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    }
    return made;
  }

  private target(w: number, h: number, format: number, linear = true): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!, fbo = gl.createFramebuffer()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, format, w, h);
    this.filter(linear ? gl.LINEAR : gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo, w, h };
  }

  private free(t: Target | null): void {
    if (!t) return;
    this.gl.deleteTexture(t.tex);
    this.gl.deleteFramebuffer(t.fbo);
  }

  // w and h in device pixels, and how many of them to a CSS pixel.
  resize(w: number, h: number, dpr: number): void {
    if (!this.ok || !this.budget || (w === this.w && h === this.h)) return;
    const gl = this.gl;
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = w;
    this.canvas.height = h;
    [this.light, this.behind, this.whole, this.mask, ...this.down, ...this.up].forEach((t) => this.free(t));
    this.mask = this.shapes.plates ? this.target(w, h, gl.R8) : null;
    if (this.scene) { gl.deleteFramebuffer(this.scene.fbo); gl.deleteRenderbuffer(this.scene.color); gl.deleteRenderbuffer(this.scene.depth); }
    this.light = this.target(w, h, gl.RGBA8);
    this.behind = this.target(w, h, gl.SRGB8_ALPHA8);
    this.whole = this.target(w, h, gl.SRGB8_ALPHA8);
    // The glow starts at one texel to a CSS pixel, so it is the same width on every screen.
    const soft = this.float ? gl.RGBA16F : gl.RGBA8;
    this.down = [];
    this.up = [];
    let lw = Math.max(4, Math.round(w / dpr)), lh = Math.max(4, Math.round(h / dpr));
    for (let k = 0; k <= this.budget.levels; k++) {
      this.down.push(this.target(lw, lh, soft));
      this.up.push(this.target(lw, lh, soft));
      lw = Math.max(2, Math.round(lw / 2));
      lh = Math.max(2, Math.round(lh / 2));
    }
    const samples = Math.min(this.budget.samples, gl.getParameter(gl.MAX_SAMPLES) as number);
    const fbo = gl.createFramebuffer()!, color = gl.createRenderbuffer()!, depth = gl.createRenderbuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.bindRenderbuffer(gl.RENDERBUFFER, color);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.SRGB8_ALPHA8, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT16, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    this.scene = { fbo, color, depth };
  }

  // bars: every straight solid that throws a shadow, the rails and their finials among them.
  setRelief(title: TitleField | null, cards: CardShape[], posts: PostShape[] = [], rails: RailShape[] = [], stood: CardShape[] = [], bars: Bar[] = []): void {
    this.title = title;
    this.cards = cards;
    this.stood = stood;
    this.bars = bars;
    this.posts = posts;
    this.rails = rails;
    if (!this.ok || !title) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.sdf);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, title.w, title.h, 0, gl.RG, gl.UNSIGNED_BYTE, title.data);
    this.filter(gl.LINEAR);
  }

  // A card's relief, as the plate renderer baked it: two pictures, bottom row first. Cards of one size share one.
  hasBake(key: string): boolean {
    return this.bakes.has(key);
  }

  setBake(key: string, w: number, h: number, b0: Uint8Array, b1: Uint8Array): void {
    if (!this.ok || this.bakes.has(key)) return;
    const gl = this.gl;
    const make = (data: Uint8Array) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      this.filter(gl.LINEAR);
      return t;
    };
    this.bakes.set(key, { b0: make(b0), b1: make(b1) });
  }

  // Reliefs no card on the page uses any more are let go.
  keepBakes(keys: Set<string>): void {
    for (const [key, t] of this.bakes) if (!keys.has(key)) { this.gl.deleteTexture(t.b0); this.gl.deleteTexture(t.b1); this.bakes.delete(key); }
  }

  // Where the things on the page stand this frame, for when they move: a card changing, a row growing.
  place(cards: CardShape[], posts: PostShape[], rails: RailShape[], stood: CardShape[], bars: Bar[]): void {
    this.cards = cards;
    this.posts = posts;
    this.rails = rails;
    this.stood = stood;
    this.bars = bars;
  }

  private fill(buffer: WebGLBuffer, data: Float32Array, floats: number, key: 'core' | 'streaks' | 'shards'): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (this.sizes[key] < data.length) { gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW); this.sizes[key] = data.length; }
    if (floats > 0) gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, floats);
  }

  private lit(p: Program, f: Frame): void {
    const gl = this.gl;
    gl.uniform4fv(p.u('uView'), f.view);
    gl.uniform1f(p.u('uUnit'), f.unit);
    gl.uniform1f(p.u('uDpr'), this.dpr);
    gl.uniform3f(p.u('uLamp'), f.lamp[0], f.lamp[1], f.lamp[2]);
    gl.uniform1f(p.u('uLampI'), f.lamp[3]);
  }

  private field(p: Program, unit: number, c: CardShape | undefined = this.cards[0]): void {
    const gl = this.gl, t = this.title;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.sdf);
    gl.uniform1i(p.u('uSdf'), 2);
    gl.uniform4fv(p.u('uSdfRect'), t ? t.rect : [-1e6, -1e6, 1, 1]);
    gl.uniform3fv(p.u('uSdfRange'), t ? t.range : [1, 1e4, 0]);
    gl.uniform2f(p.u('uSdfTexel'), t ? 1 / t.w : 1, t ? 1 / t.h : 1);
    gl.uniform4f(p.u('uCard'), c ? c.x : -1e6, c ? c.y : -1e6, c ? c.hw : 1, c ? c.hh : 1);
    gl.uniform1f(p.u('uCardR'), c ? c.r : 1);
    gl.uniform1f(p.u('uUnit'), unit);
  }

  private glow(p: Program, unit = 1): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.up[0].tex);
    gl.uniform1i(p.u('uGlow'), unit);
  }

  private shards(p: Program, f: Frame, layer: number, kinds: number, firstKind: number): void {
    const gl = this.gl;
    const stride = INSTANCE_FLOATS * 4;
    for (let k = 0; k < kinds; k++) {
      const o = (layer * KINDS + k) * 2, first = f.lots[o], count = f.lots[o + 1];
      if (count <= 0) continue;
      for (let i = 0; i < 4; i++) gl.vertexAttribPointer(MESH.length + i, 4, gl.FLOAT, false, stride, first * stride + i * 16);
      const mesh = this.meshes.kinds[firstKind + k];
      gl.drawArraysInstanced(gl.TRIANGLES, mesh.first, mesh.count, count);
    }
  }

  draw(f: Frame): void {
    const gl = this.gl;
    if (!this.ok || !this.budget || !this.light || !this.scene || !this.behind || !this.whole) return;
    const { w, h } = this;
    const P = this.prog;
    this.fill(this.coreBuffer, f.core, (f.coreRuns[0] + f.coreRuns[1] + f.coreRuns[2] + f.coreRuns[3]) * CORE_FLOATS, 'core');
    this.fill(this.streakBuffer, f.streaks, f.streakCount * STREAK_FLOATS, 'streaks');
    const shardCount = f.lots.reduce((n, v, i) => (i % 2 ? Math.max(n, f.lots[i - 1] + v) : n), 0);
    this.fill(this.shardBuffer, f.shards, shardCount * INSTANCE_FLOATS, 'shards');

    // ---- the light
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.light.fbo);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(P.core.p);
    gl.uniform4fv(P.core.u('uView'), f.view);
    gl.uniform1f(P.core.u('uTime'), f.time);
    gl.uniform1f(P.core.u('uHeart'), 1 + GLOW.more.heart * f.presence);
    gl.bindVertexArray(this.coreArray);
    for (let b = 0; b < 2; b++) {
      if (f.coreRuns[b * 2 + 1] < 3) continue;
      gl.uniform1f(P.core.u('uEnergy'), f.energy[b]);
      gl.uniform2f(P.core.u('uOwn'), b * 1777, b * f.split);
      if (this.ends) gl.uniform1f(P.core.u('uEnd'), b ? f.end : 1e6);
      if (this.shapes.swell) {
        gl.uniform3fv(P.core.u('uSwell[0]'), f.swell ? f.swell[b] : this.calm);
        gl.uniform2f(P.core.u('uSwellSize'), STREAM.change.swell[1], STREAM.change.swell[2]);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, f.coreRuns[b * 2], f.coreRuns[b * 2 + 1]);
    }
    if (f.streakCount > 0) {
      gl.useProgram(P.streak.p);
      gl.uniform4fv(P.streak.u('uView'), f.view);
      gl.bindVertexArray(this.streakArray);
      gl.drawArrays(gl.TRIANGLES, 0, f.streakCount);
    }
    gl.blendEquation(gl.FUNC_ADD);
    gl.disable(gl.BLEND);

    // ---- the glow
    gl.bindVertexArray(this.quad);
    gl.activeTexture(gl.TEXTURE0);
    gl.useProgram(P.down.p);
    gl.uniform1i(P.down.u('uSrc'), 0);
    this.down.forEach((t, k) => {
      const src = k === 0 ? this.light! : this.down[k - 1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, t.w, t.h);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform2f(P.down.u('uTexel'), 1 / src.w, 1 / src.h);
      gl.uniform1f(P.down.u('uFirst'), k === 0 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
    gl.useProgram(P.up.p);
    gl.uniform1i(P.up.u('uLevel'), 0);
    gl.uniform1i(P.up.u('uWider'), 1);
    for (let k = this.up.length - 1; k >= 0; k--) {
      const t = this.up[k], top = k === this.up.length - 1, wider = top ? t : this.up[k + 1];
      const skip = GLOW.near.length - this.up.length;
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, t.w, t.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.down[k].tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, top ? this.down[k].tex : wider.tex);
      gl.uniform2f(P.up.u('uTexel'), 1 / wider.w, 1 / wider.h);
      gl.uniform3f(P.up.u('uWeight'), GLOW.near[k], GLOW.wide[k === 0 ? 0 : k + skip], GLOW.close[k]);
      gl.uniform1f(P.up.u('uTop'), top ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // ---- where the project cards stand
    const plates = P.hole && this.mask ? f.plates ?? [] : [];
    const plate = (p: Program, c: PlateCard) => {
      gl.uniform1f(p.u('uThere'), c.there);
      gl.uniform4f(p.u('uBox'), c.x, c.y, c.hw, c.hh);
      gl.uniform2f(p.u('uRound'), c.inset, c.r);
      gl.uniformMatrix3fv(p.u('uTurn'), false, c.turn);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    if (this.mask) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.mask.fbo);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(P.hole.p);
      gl.uniform4fv(P.hole.u('uView'), f.view);
      gl.uniform1f(P.hole.u('uDpr'), this.dpr);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.MAX);
      gl.blendFunc(gl.ONE, gl.ONE);
      for (const c of plates) plate(P.hole, c);
      gl.blendEquation(gl.FUNC_ADD);
      gl.disable(gl.BLEND);
    }

    // ---- the picture
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const relief = (p: Program, rect: number[], card?: CardShape) => {
      gl.useProgram(p.p);
      this.lit(p, f);
      this.glow(p);
      this.field(p, f.unit, card);
      gl.uniform4fv(p.u('uRect'), rect);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const lot = (p: Program, layer: number, kinds: number, firstKind: number) => {
      gl.useProgram(p.p);
      this.lit(p, f);
      gl.uniform1f(p.u('uDeep'), GLOW.deep * f.unit);
      gl.bindVertexArray(this.shardArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.shardBuffer);
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.enable(gl.CULL_FACE);
      gl.frontFace(gl.CW);
      this.shards(p, f, layer, kinds, firstKind);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
    };
    const set = SETS[f.look], first = f.look === 'first';
    const solidProgram = first ? P.copper : P.solid, clearProgram = first ? P.glass : P.clear;
    lot(solidProgram, 0, set.solid[1], set.solid[0]);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
    gl.useProgram(P.light.p);
    gl.bindVertexArray(this.quad);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.light.tex);
    gl.uniform1i(P.light.u('uLight'), 0);
    this.glow(P.light);
    gl.uniform1f(P.light.u('uNear'), GLOW.nearGain);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // A project card stands in front of the light too, but it is not drawn here: everything behind it is taken out
    // of the picture, so the card in the page shows, and then the stream's light on it is laid in.
    if (plates.length) {
      gl.useProgram(P.hole.p);
      gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
      for (const c of plates) plate(P.hole, c);
      gl.useProgram(P.plate.p);
      this.lit(P.plate, f);
      this.glow(P.plate);
      gl.uniform1i(P.plate.u('uB0'), 3);
      gl.uniform1i(P.plate.u('uB1'), 4);
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
      for (const c of plates) {
        const bake = this.bakes.get(c.bake);
        if (!bake) continue;
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, bake.b0);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, bake.b1);
        gl.uniform4fv(P.plate.u('uWin'), c.win);
        gl.uniform3f(P.plate.u('uFrame'), c.frame, c.rim, c.unit);
        gl.uniform2f(P.plate.u('uTilt'), c.tiltX, c.tiltY);
        gl.uniform3f(P.plate.u('uFlare'), c.flare, c.struck[0], c.struck[1]);
        plate(P.plate, c);
      }
    }

    // The title and the card stand in front of the light: where the core lies along one of them, the surface cuts it
    // off cleanly, and that line is what makes it rest there.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (const c of this.cards) relief(P.card, [c.x - c.hw - 2, c.y - c.hh - 2, c.hw * 2 + 4, c.hh * 2 + 4], c);
    if (this.title) relief(P.title, this.title.rect);
    // The posts and the rail stand in front of the light as the card does.
    for (const r of P.rail ? this.rails : []) {
      gl.useProgram(P.rail.p);
      gl.uniform4f(P.rail.u('uRail'), r.ax, r.ay, r.bx, r.by);
      gl.uniform2f(P.rail.u('uRailSize'), r.half, r.own);
      gl.uniform4f(P.rail.u('uEnds'), r.blade[0], r.blade[1], r.ends[0], r.ends[1]);
      gl.uniform3fv(P.rail.u('uKeel'), r.keel);
      const pad = r.half * (STREAM.work.finial.collar + r.blade[0] + Math.max(r.blade[1], 3.3 * r.keel[2] + 1.6)) + 2;
      relief(P.rail, [Math.min(r.ax, r.bx) - pad, Math.min(r.ay, r.by) - pad, Math.abs(r.bx - r.ax) + pad * 2, Math.abs(r.by - r.ay) + pad * 2]);
    }
    if (P.post && this.stone) this.posts.forEach((o, i) => {
      gl.useProgram(P.post.p);
      gl.uniform4f(P.post.u('uPost'), o.x, o.y, o.r, o.own);
      gl.uniform1f(P.post.u('uLit'), f.lit?.[i] ?? 0);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.stone![0]);
      gl.uniform1i(P.post.u('uT0'), 5);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.stone![1]);
      gl.uniform1i(P.post.u('uT1'), 6);
      relief(P.post, [o.x - o.r - 2, o.y - o.r - 2, o.r * 2 + 4, o.r * 2 + 4]);
    });

    lot(solidProgram, 1, set.solid[1], set.solid[0]);

    const resolve = (to: Target) => {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.scene!.fbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, to.fbo);
      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    };
    resolve(this.behind);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
    gl.useProgram(clearProgram.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.behind.tex);
    gl.uniform1i(clearProgram.u('uScene'), 0);
    gl.uniform2f(clearProgram.u('uRes'), w, h);
    lot(clearProgram, 2, set.clear[1], set.clear[0]);
    resolve(this.whole);

    // ---- onto the page
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.BLEND);
    gl.useProgram(P.final.p);
    this.lit(P.final, f);
    this.glow(P.final);
    this.field(P.final, f.unit);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.whole.tex);
    gl.uniform1i(P.final.u('uScene'), 0);
    gl.uniform1f(P.final.u('uPage'), GLOW.page + GLOW.more.page * f.presence);
    gl.uniform1f(P.final.u('uRelief'), this.title || this.cards.length ? 1 : 0);
    if (this.shapes.cards > 1 || this.shapes.posts || this.shapes.rails) {
      const n = this.shapes;
      const far = [-1e6, -1e6, 1, 1];
      const boxes = [...this.cards, ...this.stood];
      gl.uniform4fv(P.final.u('uCards[0]'), Array.from({ length: Math.max(1, n.cards) }, (_, i) => { const c = boxes[i]; return c ? [c.x, c.y, c.hw, c.hh] : far; }).flat());
      gl.uniform1fv(P.final.u('uCardRs[0]'), Array.from({ length: Math.max(1, n.cards) }, (_, i) => boxes[i]?.r ?? 1));
      gl.uniform3fv(P.final.u('uPosts[0]'), Array.from({ length: Math.max(1, n.posts) }, (_, i) => { const o = this.posts[i]; return o ? [o.x, o.y, o.r] : [-1e6, -1e6, 1]; }).flat());
      gl.uniform4fv(P.final.u('uRails[0]'), Array.from({ length: Math.max(1, n.rails) }, (_, i) => { const r = this.bars[i]; return r ? [r.ax, r.ay, r.bx, r.by] : far; }).flat());
      gl.uniform1fv(P.final.u('uRailHalves[0]'), Array.from({ length: Math.max(1, n.rails) }, (_, i) => this.bars[i]?.half ?? 1));
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.mask ? this.mask.tex : this.none);
      gl.uniform1i(P.final.u('uMask'), 3);
    }
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
