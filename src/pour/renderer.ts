import { palette, type PaletteName } from '../config/palette';
import { LAMP } from '../config/site';
import { POUR, type PourBudget } from './config';
import type { Scene } from './scene';
import type { PourSim } from './sim';
import { BODY_FRAG, COVER_FRAG, DOWN_FRAG, FIELD_FRAG, FIELD_VERT, FINAL_FRAG, FULL_VERT, SPARK_FRAG, SPARK_VERT, UP_FRAG } from './shaders';

// A particle's dot in the field reaches this many spacings, and a body's surface bulges this many units toward the viewer.
const DOT_REACH = 3.1;
// How far into a body its roundness reaches, in units, and how strongly that and the field's fine ripples tilt the surface.
const ROUND_REACH = 4.5;
const BULGE = 2.6;
const RIPPLE = 0.9;
// The weight of a particle in a body never goes past what this fraction of the resting density would give it.
const THINNEST = 0.3;
// Below this fraction of resting density a particle starts to be drawn as a bead: a smaller dot, this much of the full
// reach, whose peak sits between these two values. The surface level is 0.2, so the peak sets the bead's size.
const ALONE_AT = 0.82;
const BEAD = { reach: 0.5, small: 0.215, big: 0.34 };
// How much of the light that lands on the page comes back off it. The page is near black, so little does.
const PAGE_FACE = [0.085, 0.066, 0.055];
const GLOW_LEVELS = 6;
// How much of each wider copy of the glow is added to the one below it. Past 1, the wide soft light outweighs the tight
// halo. Only the finest copy is ever sampled, after every wider one has been added into it, so it is always smooth.
const GLOW_GAIN = [1.5, 1.6, 1.5, 1.3, 1.1];
const MAX_SLABS = 2;
const PARTICLE_FLOATS = 6;
const SPARK_FLOATS = 6;

// The palette's light colors as one ramp, from nothing to the hottest. The stops are positions along x / (1 + x), where
// x is how much light a pixel emits.
const RAMP: [number, PaletteName | null][] = [
  [0, null],
  [0.03, 'ember-deep'],
  [0.12, 'ember'],
  [0.36, 'flame'],
  [0.54, 'hot'],
  [0.78, 'pale'],
  [1, 'pale'],
];

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function linear(name: PaletteName): [number, number, number] {
  const v = parseInt(palette[name].slice(1), 16);
  return [toLinear(((v >> 16) & 255) / 255), toLinear(((v >> 8) & 255) / 255), toLinear((v & 255) / 255)];
}

function rampPixels(): Uint8Array {
  const out = new Uint8Array(256 * 4);
  const stops = RAMP.map(([at, name]) => ({ at, c: name ? linear(name) : ([0, 0, 0] as [number, number, number]) }));
  for (let i = 0; i < 256; i++) {
    const u = i / 255;
    let k = 0;
    while (k < stops.length - 2 && u > stops[k + 1].at) k++;
    const a = stops[k];
    const b = stops[k + 1];
    const f = Math.min(1, Math.max(0, (u - a.at) / (b.at - a.at)));
    const e = f * f * (3 - 2 * f);
    for (let ch = 0; ch < 3; ch++) out[i * 4 + ch] = Math.round(toSrgb(a.c[ch] + (b.c[ch] - a.c[ch]) * e) * 255);
    out[i * 4 + 3] = 255;
  }
  return out;
}

// Draws the pour: particles into a field, the field into one lit body, its glow spread wide, and the page and slab
// lit by that glow. One WebGL2 context.
export class PourRenderer {
  readonly ok: boolean;
  private gl: WebGL2RenderingContext;
  private programs: Record<string, WebGLProgram> = {};
  private uniforms: Record<string, Record<string, WebGLUniformLocation | null>> = {};
  private full!: WebGLVertexArrayObject;
  private pointVao!: WebGLVertexArrayObject;
  private pointBuf!: WebGLBuffer;
  private pointData = new Float32Array(0);
  private sparkVao!: WebGLVertexArrayObject;
  private sparkBuf!: WebGLBuffer;
  private sparkData = new Float32Array(0);
  private field: Target | null = null;
  private body: Target | null = null;
  private cover: Target | null = null;
  private deep: Target[] = [];
  private glowChain: Target[] = [];
  private ramp!: WebGLTexture;
  private heat!: WebGLTexture;
  private heatSize = { w: 1, h: 1 };
  private heatRows: number[] = [];
  private w = 0;
  private h = 0;
  private unitPx = 1;
  private scene!: Scene;
  private sim!: PourSim;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    this.gl = gl as WebGL2RenderingContext;
    this.ok = !!gl && (!!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float'));
    if (!this.ok) return;
    this.build();
  }

  // The scene and simulation to draw. Called again when the screen or the quality tier changes.
  show(scene: Scene, budget: PourBudget, sim: PourSim): void {
    this.scene = scene;
    this.sim = sim;
    if (!this.ok) return;
    const gl = this.gl;
    this.pointData = new Float32Array(budget.maxFluid * PARTICLE_FLOATS);
    this.sparkData = new Float32Array(budget.maxSparks * SPARK_FLOATS);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.pointData.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sparkBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.sparkData.byteLength, gl.DYNAMIC_DRAW);
    // Every slab's grid of warmth in one texture, one above the other, with a spare row between.
    const sizes = sim.heatSize;
    this.heatSize = { w: Math.max(2, ...sizes.map((s) => s.w)), h: Math.max(2, sizes.reduce((a, s) => a + s.h + 1, 0)) };
    this.heatRows = [];
    let row = 0;
    for (const s of sizes) { this.heatRows.push(row); row += s.h + 1; }
    gl.bindTexture(gl.TEXTURE_2D, this.heat);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.heatSize.w, this.heatSize.h, 0, gl.RED, gl.FLOAT, new Float32Array(this.heatSize.w * this.heatSize.h));
  }

  private build(): void {
    const gl = this.gl;
    const make = (name: string, vs: string, fs: string, attribs: string[]) => {
      const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`pour shader ${name}: ${gl.getShaderInfoLog(s)}`);
        return s;
      };
      const p = gl.createProgram()!;
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`pour program ${name}: ${gl.getProgramInfoLog(p)}`);
      this.programs[name] = p;
      const u: Record<string, WebGLUniformLocation | null> = {};
      const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(p, i)!;
        const base = info.name.replace(/\[0\]$/, '');
        u[base] = gl.getUniformLocation(p, base);
      }
      this.uniforms[name] = u;
    };
    make('field', FIELD_VERT, FIELD_FRAG, ['aPos', 'aData']);
    make('cover', FULL_VERT, COVER_FRAG, ['a']);
    make('body', FULL_VERT, BODY_FRAG, ['a']);
    make('spark', SPARK_VERT, SPARK_FRAG, ['aCorner', 'aSpark', 'aHeat']);
    make('down', FULL_VERT, DOWN_FRAG, ['a']);
    make('up', FULL_VERT, UP_FRAG, ['a']);
    make('final', FULL_VERT, FINAL_FRAG, ['a']);

    this.full = gl.createVertexArray()!;
    gl.bindVertexArray(this.full);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const stride = PARTICLE_FLOATS * 4;
    this.pointVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.pointVao);
    this.pointBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 8);

    this.sparkVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.sparkVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.sparkBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sparkBuf);
    const sparkStride = SPARK_FLOATS * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, sparkStride, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, sparkStride, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);

    this.ramp = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.ramp);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rampPixels());
    this.clampLinear();

    this.heat = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.heat);
    this.clampLinear();
  }

  private clampLinear(): void {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private target(w: number, h: number): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    this.clampLinear();
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo, w, h };
  }

  private drop(t: Target | null): void {
    if (!t) return;
    this.gl.deleteTexture(t.tex);
    this.gl.deleteFramebuffer(t.fbo);
  }

  // The canvas in device pixels, and how many of them one unit of the scene is.
  resize(w: number, h: number, unitPx: number): void {
    this.unitPx = unitPx;
    if (!this.ok || (w === this.w && h === this.h)) return;
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.drop(this.field);
    this.drop(this.body);
    this.drop(this.cover);
    this.deep.forEach((t) => this.drop(t));
    this.glowChain.forEach((t) => this.drop(t));
    this.field = this.target(w, h);
    this.body = this.target(w, h);
    this.cover = this.target(w, h);
    // Halved until one step of the blur is about as wide as the roundness should reach.
    const halvings = Math.min(4, Math.max(1, Math.round(Math.log2((ROUND_REACH * unitPx) / 1.5))));
    this.deep = [];
    for (let i = 1; i <= halvings; i++) this.deep.push(this.target(Math.max(2, w >> i), Math.max(2, h >> i)));
    this.glowChain = [];
    let gw = w;
    let gh = h;
    for (let i = 0; i < GLOW_LEVELS; i++) {
      gw = Math.max(2, gw >> 1);
      gh = Math.max(2, gh >> 1);
      this.glowChain.push(this.target(gw, gh));
    }
  }

  private use(name: string): Record<string, WebGLUniformLocation | null> {
    this.gl.useProgram(this.programs[name]);
    return this.uniforms[name];
  }

  private bind(unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }

  private into(t: Target | null): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
    gl.viewport(0, 0, t ? t.w : this.w, t ? t.h : this.h);
  }

  private slabUniforms(u: Record<string, WebGLUniformLocation | null>): void {
    const gl = this.gl;
    const slabs = this.scene.slabs.slice(0, MAX_SLABS);
    const flat = new Float32Array(MAX_SLABS * 4);
    slabs.forEach((s, i) => flat.set([s.cx, s.cy, s.hx, s.hy], i * 4));
    gl.uniform4fv(u.uSlab, flat);
    gl.uniform1f(u.uSlabR, slabs[0]?.r ?? 0);
    gl.uniform1i(u.uSlabs, slabs.length);
  }

  // lamp: the cursor light's place in the viewport, in CSS pixels.
  draw(lamp: { px: number; py: number }): void {
    if (!this.ok || !this.field || !this.body || !this.cover || !this.sim) return;
    const gl = this.gl;
    const sim = this.sim;
    const scene = this.scene;
    const n = sim.n;
    const data = this.pointData;
    const norm = (0.866 * 3) / (Math.PI * DOT_REACH * DOT_REACH);
    for (let i = 0, o = 0; i < n; i++, o += PARTICLE_FLOATS) {
      data[o] = sim.x[i];
      data[o + 1] = sim.y[i];
      data[o + 2] = sim.temp[i];
      // A particle in a body is a wide soft dot, drawn heavier the fewer neighbors it has, so a thrown sheet is as
      // solid as a packed body. A particle on its own is a small sharp dot: a bead, each a slightly different size.
      const d = sim.dens[i];
      const alone = Math.min(1, Math.max(0, (ALONE_AT - d) / (ALONE_AT - 0.2)));
      const inBody = norm / Math.min(1, Math.max(THINNEST, d));
      const bead = BEAD.small + (BEAD.big - BEAD.small) * ((sim.skin[i] * 61.7 + i * 0.37) % 1);
      data[o + 3] = sim.size[i] * (inBody + (bead - inBody) * alone);
      data[o + 4] = sim.skin[i];
      data[o + 5] = 1 + (BEAD.reach - 1) * alone;
    }
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    this.into(this.field);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (n > 0) {
      const u = this.use('field');
      gl.bindVertexArray(this.pointVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, n * PARTICLE_FLOATS);
      gl.uniform2f(u.uView, scene.w, scene.h);
      gl.uniform1f(u.uPoint, 2 * DOT_REACH * sim.spacing * this.unitPx);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, n);
      gl.disable(gl.BLEND);
    }

    gl.bindTexture(gl.TEXTURE_2D, this.heat);
    const heatMap = new Float32Array(MAX_SLABS * 4);
    sim.heat.slice(0, MAX_SLABS).forEach((grid, i) => {
      const { w, h } = sim.heatSize[i];
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, this.heatRows[i], w, h, gl.RED, gl.FLOAT, grid);
      heatMap.set([0.5 / this.heatSize.w, (this.heatRows[i] + 0.5) / this.heatSize.h, (w - 1) / this.heatSize.w, (h - 1) / this.heatSize.h], i * 4);
    });

    gl.bindVertexArray(this.full);
    this.into(this.cover);
    {
      const u = this.use('cover');
      this.bind(0, this.field.tex, u.uField);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    {
      const u = this.use('down');
      let src: Target = this.cover!;
      for (const t of this.deep) {
        this.into(t);
        this.bind(0, src.tex, u.uSrc);
        gl.uniform2f(u.uPx, 0.5 / src.w, 0.5 / src.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        src = t;
      }
    }
    {
      const u = this.use('up');
      gl.uniform1f(u.uGain, 1);
      for (let i = this.deep.length - 2; i >= 0; i--) {
        const src = this.deep[i + 1];
        this.into(this.deep[i]);
        this.bind(0, src.tex, u.uSrc);
        gl.uniform2f(u.uPx, 1 / src.w, 1 / src.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }

    this.into(this.body);
    {
      const u = this.use('body');
      const deep = this.deep[0];
      const reach = (ROUND_REACH * this.unitPx) / 2;
      this.bind(0, this.field.tex, u.uField);
      this.bind(1, this.heat, u.uHeat);
      this.bind(2, deep.tex, u.uDeep);
      gl.uniform2f(u.uPx, 1 / this.w, 1 / this.h);
      gl.uniform2f(u.uDeepPx, reach / this.w, reach / this.h);
      gl.uniform1f(u.uBulge, BULGE);
      gl.uniform1f(u.uRipple, RIPPLE);
      gl.uniform2f(u.uView, scene.w, scene.h);
      gl.uniform4fv(u.uHeatMap, heatMap);
      this.slabUniforms(u);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    const sparks = sim.sparkCount;
    if (sparks > 0) {
      const sd = this.sparkData;
      for (let i = 0, o = 0; i < sparks; i++, o += SPARK_FLOATS) {
        sd[o] = sim.sx[i]; sd[o + 1] = sim.sy[i]; sd[o + 2] = sim.svx[i]; sd[o + 3] = sim.svy[i];
        sd[o + 4] = sim.sheat[i]; sd[o + 5] = sim.ssize[i];
      }
      const u = this.use('spark');
      gl.bindVertexArray(this.sparkVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sparkBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, sd, 0, sparks * SPARK_FLOATS);
      gl.uniform2f(u.uView, scene.w, scene.h);
      gl.uniform1f(u.uShutter, POUR.spark.shutter);
      gl.uniform1f(u.uThin, 1 / this.unitPx);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.colorMask(true, false, false, false);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, sparks);
      gl.colorMask(true, true, true, true);
      gl.disable(gl.BLEND);
    }

    // The glow: the body's light halved in size again and again, then added back up, so it reaches far and falls off softly.
    gl.bindVertexArray(this.full);
    {
      const u = this.use('down');
      let src: Target = this.body;
      for (const t of this.glowChain) {
        this.into(t);
        this.bind(0, src.tex, u.uSrc);
        gl.uniform2f(u.uPx, 0.5 / src.w, 0.5 / src.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        src = t;
      }
    }
    {
      const u = this.use('up');
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = this.glowChain.length - 2; i >= 0; i--) {
        const src = this.glowChain[i + 1];
        gl.uniform1f(u.uGain, GLOW_GAIN[i]);
        this.into(this.glowChain[i]);
        this.bind(0, src.tex, u.uSrc);
        gl.uniform2f(u.uPx, 1 / src.w, 1 / src.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.BLEND);
    }

    this.into(null);
    {
      const u = this.use('final');
      let total = 1;
      for (let i = GLOW_GAIN.length - 1; i >= 0; i--) total = 1 + GLOW_GAIN[i] * total;
      const reach = 10 * this.unitPx;
      this.bind(0, this.body.tex, u.uBody);
      this.bind(1, this.glowChain[0].tex, u.uGlow);
      this.bind(2, this.ramp, u.uRamp);
      gl.uniform2f(u.uView, scene.w, scene.h);
      gl.uniform1f(u.uUnitPx, this.unitPx);
      gl.uniform2f(u.uGlowPx, reach / this.w, reach / this.h);
      gl.uniform1f(u.uGlowNorm, 1 / total);
      gl.uniform3f(u.uLamp, lamp.px / scene.unit, lamp.py / scene.unit, LAMP.depth * scene.w);
      gl.uniform3fv(u.uBg, linear('bg'));
      gl.uniform3fv(u.uPage, PAGE_FACE);
      gl.uniform3fv(u.uBronze, linear('bronze'));
      gl.uniform3fv(u.uBronzeDeep, linear('bronze-deep'));
      gl.uniform3fv(u.uCopper, linear('copper-light'));
      gl.uniform3fv(u.uLight, linear('hot'));
      gl.uniform3fv(u.uPale, linear('pale'));
      this.slabUniforms(u);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindVertexArray(null);
  }

  dispose(): void {
    if (!this.ok) return;
    this.drop(this.field);
    this.drop(this.body);
    this.drop(this.cover);
    this.deep.forEach((t) => this.drop(t));
    this.glowChain.forEach((t) => this.drop(t));
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
