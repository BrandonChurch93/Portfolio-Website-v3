import { hex, type PaletteName } from '../config/palette';
import { COPPER, COPPER_LIGHT } from '../metal/finishes';
import type { StreamBudget } from './config';
import * as G from './shaders';
import { COPPER_KINDS, GLASS_KINDS, VERTEX_FLOATS, type ShardMeshes } from './shards';

// Draws the stream. In order: the light, as amounts, into its own buffer. The glow, by making that buffer smaller
// step by step and building it back up. Then the picture: the title and the card, the shards behind the core, the
// light, the shards in front, and last the glass, which redraws what is behind it. Then all of it onto the page.

type GL = WebGL2RenderingContext;

export const INSTANCE_FLOATS = 16;
export const CORE_FLOATS = 5;
export const STREAK_FLOATS = 5;
// Shards are drawn in three lots, each sorted by kind: copper behind the core, copper in front, glass.
export const LAYERS = 3;
export const KINDS = Math.max(COPPER_KINDS, GLASS_KINDS);

export interface TitleField {
  data: Uint8Array;
  w: number;
  h: number;
  rect: [number, number, number, number];
  range: [number, number, number];
}

export interface CardShape { x: number; y: number; hw: number; hh: number; r: number }

export interface Frame {
  view: [number, number, number, number];
  time: number;
  unit: number;
  lamp: [number, number, number, number];
  energy: [number, number];
  split: number;                                 // where the two sides part, in units along the route
  core: Float32Array;
  coreRuns: [number, number, number, number];   // first vertex and count, for each side
  streaks: Float32Array;
  streakCount: number;
  shards: Float32Array;
  lots: Int32Array;                              // first and count for each layer and kind
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
};

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
  return { p, u };
}

type Program = ReturnType<typeof compile>;

export class StreamRenderer {
  readonly ok: boolean;
  private gl: GL;
  private float = false;
  private budget: StreamBudget | null = null;
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
  private sdf: WebGLTexture;
  private title: TitleField | null = null;
  private card: CardShape | null = null;
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
    [3, 3, 3, 1].reduce((at, size, i) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, size, gl.FLOAT, false, VERTEX_FLOATS * 4, at * 4); return at + size; }, 0);
    this.shardBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.shardBuffer);
    for (let i = 4; i < 8; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribDivisor(i, 1); }
    gl.bindVertexArray(null);

    gl.bindTexture(gl.TEXTURE_2D, this.sdf);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, 1, 1, 0, gl.RG, gl.UNSIGNED_BYTE, new Uint8Array([255, 255]));
    this.filter(gl.LINEAR);
  }

  private filter(mode: number): void {
    const gl = this.gl;
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, mode], [gl.TEXTURE_MAG_FILTER, mode], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  }

  // Programs that depend on the budget are built again when it changes.
  configure(budget: StreamBudget): void {
    if (!this.ok || this.budget === budget) return;
    const gl = this.gl, f = this.float;
    this.budget = budget;
    const shard = ['aPos', 'aNormal', 'aEdge', 'aTag', 'iPlace', 'iTurn', 'iCore', 'iMore'];
    this.prog = {
      core: compile(gl, G.CORE_VERT, G.coreFrag(budget.split ? 9 : 7), ['aPos', 'aAlong']),
      streak: compile(gl, G.STREAK_VERT, G.STREAK_FRAG, ['aPos', 'aLight']),
      down: compile(gl, G.FULL_VERT, G.downFrag(f), ['aPos']),
      up: compile(gl, G.FULL_VERT, G.upFrag(f), ['aPos']),
      title: compile(gl, G.RELIEF_VERT, G.titleFrag(f), ['aPos']),
      card: compile(gl, G.RELIEF_VERT, G.cardFrag(f), ['aPos']),
      copper: compile(gl, G.SHARD_VERT, G.COPPER_FRAG, shard),
      glass: compile(gl, G.SHARD_VERT, G.glassFrag(budget.split), shard),
      light: compile(gl, G.FULL_VERT, G.lightFrag(f), ['aPos']),
      final: compile(gl, G.FULL_VERT, G.finalFrag(f), ['aPos']),
    };
    this.w = 0;
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
    [this.light, this.behind, this.whole, ...this.down, ...this.up].forEach((t) => this.free(t));
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

  setRelief(title: TitleField | null, card: CardShape | null): void {
    this.title = title;
    this.card = card;
    if (!this.ok || !title) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.sdf);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, title.w, title.h, 0, gl.RG, gl.UNSIGNED_BYTE, title.data);
    this.filter(gl.LINEAR);
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

  private field(p: Program, unit: number): void {
    const gl = this.gl, t = this.title;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.sdf);
    gl.uniform1i(p.u('uSdf'), 2);
    gl.uniform4fv(p.u('uSdfRect'), t ? t.rect : [-1e6, -1e6, 1, 1]);
    gl.uniform3fv(p.u('uSdfRange'), t ? t.range : [1, 1e4, 0]);
    gl.uniform2f(p.u('uSdfTexel'), t ? 1 / t.w : 1, t ? 1 / t.h : 1);
    const c = this.card;
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
      for (let i = 0; i < 4; i++) gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, stride, first * stride + i * 16);
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
    gl.bindVertexArray(this.coreArray);
    for (let b = 0; b < 2; b++) {
      if (f.coreRuns[b * 2 + 1] < 3) continue;
      gl.uniform1f(P.core.u('uEnergy'), f.energy[b]);
      gl.uniform2f(P.core.u('uOwn'), b * 1777, b * f.split);
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

    // ---- the picture
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const relief = (p: Program, rect: number[]) => {
      gl.useProgram(p.p);
      this.lit(p, f);
      this.glow(p);
      this.field(p, f.unit);
      gl.uniform4fv(p.u('uRect'), rect);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const solid = (p: Program, layer: number, kinds: number, firstKind: number) => {
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
    solid(P.copper, 0, COPPER_KINDS, 0);

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

    // The title and the card stand in front of the light: where the core lies along one of them, the surface cuts it
    // off cleanly, and that line is what makes it rest there.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (this.card) relief(P.card, [this.card.x - this.card.hw - 2, this.card.y - this.card.hh - 2, this.card.hw * 2 + 4, this.card.hh * 2 + 4]);
    if (this.title) relief(P.title, this.title.rect);

    solid(P.copper, 1, COPPER_KINDS, 0);

    const resolve = (to: Target) => {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.scene!.fbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, to.fbo);
      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    };
    resolve(this.behind);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
    gl.useProgram(P.glass.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.behind.tex);
    gl.uniform1i(P.glass.u('uScene'), 0);
    gl.uniform2f(P.glass.u('uRes'), w, h);
    solid(P.glass, 2, GLASS_KINDS, COPPER_KINDS);
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
    gl.uniform1f(P.final.u('uPage'), GLOW.page);
    gl.uniform1f(P.final.u('uRelief'), this.title || this.card ? 1 : 0);
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
