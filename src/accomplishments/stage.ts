import { COPPER_LIGHT } from '../metal/finishes';
import { MAX_RATIO } from '../stream-ideas/gl';
import { lamp } from '../lamp/lamp';
import { stats } from '../hooks/registry';
import { clock } from '../world/clock';
import { ROOM } from '../work-blanks/blanks';
import { Relief, pack } from './relief';

// Draws pieces of bronze relief over the slots a page lays out for them. One canvas over the stage, one texture a
// piece, one quad a slot. The metal reflects the same room of long lights as the blanks study and takes the cursor's
// light, and what stands high throws a shadow on what lies under it.

export interface Art { w: number; h: number; draw(r: Relief): void }
export interface Slot { el: HTMLElement; art: Art }
export interface Stage { antique(amount: number): void; dispose(): void }

const FONTS = ['700 60px "Sora Variable"', '700 14px "JetBrains Mono Variable"'];
// The most pixels one canvas of reliefs is drawn at. A larger stage is drawn at fewer pixels to a CSS pixel.
const BUDGET = 7e6;

const VERT = `#version 300 es
in vec2 a;
uniform vec4 uRect;
uniform vec2 uCanvas;
void main(){
  vec2 p = (uRect.xy + a * uRect.zw) / uCanvas;
  gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec4 uRect;
uniform vec2 uCanvas, uOrigin, uView, uTexel;
uniform vec3 uLamp, uMetal;
uniform float uDpr, uDu, uAntique;
out vec4 frag;

${ROOM}

// What the metal reflects: the blanks' long lights, and one wide soft light straight in front, as polished metal is
// photographed. A face turned to the viewer reflects the soft light and is bright. A bevel reflects the dark room.
vec3 around(vec2 d, float blur, vec2 dl){
  float b = 0.05 + blur * 1.5;
  float front = (1.0 - smoothstep(0.46 - b, 0.46 + b, abs(d.y))) * (1.0 - smoothstep(1.1, 1.7, abs(d.x)));
  return room(d, blur, dl) * 0.78 + vec3(1.0, 0.92, 0.82) * 0.84 * front;
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uCanvas.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 uv = (px - uRect.xy) / uRect.zw;
  vec4 t = texture(uTex, uv);
  if (t.a <= 0.003) discard;
  float hx = texture(uTex, uv + vec2(uTexel.x, 0.0)).r - texture(uTex, uv - vec2(uTexel.x, 0.0)).r;
  float hy = texture(uTex, uv + vec2(0.0, uTexel.y)).r - texture(uTex, uv - vec2(0.0, uTexel.y)).r;
  vec3 N = normalize(vec3(-hx / (2.0 * uDu), -hy / (2.0 * uDu), 1.0));

  // What stands between this point and the light, which is up and to the right, throws its shadow here.
  float shade = 0.0;
  vec2 toLight = normalize(vec2(0.74, -0.67)) * uTexel / uDu;
  for (int i = 1; i <= 14; i++){
    float run = float(i) * 1.9;
    float over = texture(uTex, uv + toLight * run).r - t.r - run * 0.62;
    shade = max(shade, smoothstep(0.0, 1.6, over));
  }

  // How hollow this point is: above zero in a recess, below it on a high point.
  vec2 r = uTexel * 2.6 / uDu;
  float hollow = (texture(uTex, uv + vec2(r.x, 0.0)).r + texture(uTex, uv - vec2(r.x, 0.0)).r + texture(uTex, uv + vec2(0.0, r.y)).r + texture(uTex, uv - vec2(0.0, r.y)).r) * 0.25 - t.r;
  float pit = clamp(hollow * 1.1, 0.0, 1.0), worn = clamp(-hollow * 1.5, 0.0, 1.0);

  // Aged metal has lost its polish everywhere but where hands still rub it.
  // Satin metal has a grain. It is the grain that tells it from the polish beside it up close.
  float satin = clamp(mix(t.g, max(t.g, 0.5), uAntique) - uAntique * worn * 0.42, 0.0, 1.0), gloss = 1.0 - satin;
  vec2 cell = floor(uv / uTexel);
  vec2 grain = vec2(fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453), fract(sin(dot(cell, vec2(39.346, 11.135))) * 24634.6345)) - 0.5;
  N = normalize(N + vec3(grain * 0.075 * smoothstep(0.2, 0.7, satin), 0.0));

  vec2 at = uOrigin + px;
  vec3 V = normalize(vec3(uView * 0.5 - at, 1100.0));
  vec3 R = reflect(-V, N);
  vec2 d = vec2(R.x, -R.y) / max(R.z, 0.25);
  vec2 dl = vec2(uLamp.x - at.x, -(uLamp.y - at.y)) / 420.0;
  // Where a bevel turns fast, one pixel looks at a wide piece of the room. The lights are softened by that much.
  float turn = min(length(fwidth(d)) * 0.9, 0.4);
  vec3 mirror = around(d, satin * 0.24 + turn, dl);
  vec3 L = normalize(vec3(0.55, -0.6, 0.58));
  float key = max(dot(N, L), 0.0);
  float glint = pow(max(dot(N, normalize(L + V)), 0.0), mix(22.0, 260.0, gloss)) * mix(0.3, 1.9, gloss);
  vec3 toLamp = vec3(uLamp.xy - at, 240.0);
  float near = max(dot(N, normalize(toLamp)), 0.0) * 62000.0 / (62000.0 + dot(toLamp.xy, toLamp.xy));
  vec3 metal = uMetal;
  vec3 col = metal * (mirror * mix(0.36, 1.0, gloss) + gloss * 0.05 + satin * vec3(0.86, 0.72, 0.56) * (0.04 + 0.4 * key))
    + vec3(1.0, 0.86, 0.66) * glint + vec3(1.0, 0.8, 0.56) * near * mix(0.16, 0.5, satin);
  col *= 1.0 - 0.66 * shade;
  // Patina lies where a cloth cannot reach. On aged metal it lies everywhere but the high points.
  float patina = clamp(t.b * 0.8 + uAntique * (0.34 + 0.2 * t.b + 0.5 * pit - 0.62 * worn), 0.0, 1.0);
  col = mix(col, col * vec3(0.17, 0.12, 0.085), patina);
  col *= 1.0 - 0.34 * pit + 0.08 * worn;
  col = pow(min(col, vec3(1.0)), vec3(1.0 / 2.2));
  frag = vec4(col * t.a, t.a);
}`;

function compile(gl: WebGL2RenderingContext): { p: WebGLProgram; u: (n: string) => WebGLUniformLocation | null } {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as [number, string][]) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`relief shader: ${gl.getShaderInfoLog(sh)}`);
    gl.attachShader(p, sh);
  }
  gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`relief program: ${gl.getProgramInfoLog(p)}`);
  const found = new Map<string, WebGLUniformLocation | null>();
  return { p, u: (n) => { if (!found.has(n)) found.set(n, gl.getUniformLocation(p, n)); return found.get(n)!; } };
}

interface Made { tex: WebGLTexture; W: number; H: number; s: number; cssW: number }

export function mountStage(canvas: HTMLCanvasElement, slots: Slot[]): Stage {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return { antique() {}, dispose() {} };
  const { p, u } = compile(gl);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  lamp.bind();
  const made: (Made | null)[] = slots.map(() => null);
  let antique = 0, alive = true, queued = false, built = 0;
  const ratio = () => {
    const box = canvas.getBoundingClientRect();
    return Math.min(MAX_RATIO, devicePixelRatio || 1, Math.sqrt(BUDGET / Math.max(1, box.width * box.height)));
  };
  const near = () => { const box = canvas.getBoundingClientRect(); return box.bottom > -innerHeight && box.top < innerHeight * 2; };

  // One piece at a time, so the page keeps answering while the reliefs are worked out.
  const build = async () => {
    if (queued || !near()) return;
    queued = true;
    await Promise.all(FONTS.map((f) => document.fonts.load(f)));
    for (let i = 0; i < slots.length && alive; i++) {
      const { el, art } = slots[i], cssW = el.getBoundingClientRect().width;
      if (cssW < 2 || (made[i] && Math.abs(made[i]!.cssW - cssW) < 1)) continue;
      const s = (cssW / art.w) * ratio(), relief = new Relief(art.w, art.h, s), t0 = performance.now();
      art.draw(relief);
      const job = relief.job(), took = performance.now() - t0;
      stats.reliefMs = (stats.reliefMs ?? 0) + took;
      stats.reliefMax = Math.max(stats.reliefMax ?? 0, took);
      const r = await pack(job);
      if (!alive) return;
      const tex = made[i]?.tex ?? gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, r.W, r.H, 0, gl.RGBA, gl.FLOAT, r.data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      made[i] = { tex, W: r.W, H: r.H, s, cssW };
      built++;
      el.dataset.made = 'true';
    }
    queued = false;
  };
  build();
  const watch = new ResizeObserver(() => build());
  watch.observe(canvas);

  let last = '';
  const off = clock.onFrame(() => {
    const box = canvas.getBoundingClientRect(), dpr = ratio();
    if (box.bottom < 0 || box.top > innerHeight) { if (!queued && made.includes(null)) build(); return; }
    if (!queued && made.includes(null)) build();
    const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    // Nothing is drawn again while the light, the page and the pieces are where they were.
    const l = lamp.get();
    const now = `${w}:${h}:${Math.round(box.left * 2)}:${Math.round(box.top * 2)}:${Math.round(l.px)}:${Math.round(l.py)}:${antique}:${built}:${innerWidth}:${innerHeight}`;
    if (now === last) return;
    last = now;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p);
    gl.uniform2f(u('uCanvas'), box.width, box.height);
    gl.uniform2f(u('uOrigin'), box.left, box.top);
    gl.uniform2f(u('uView'), innerWidth, innerHeight);
    gl.uniform3f(u('uLamp'), l.px, l.py, 0);
    gl.uniform1f(u('uDpr'), dpr);
    gl.uniform1f(u('uAntique'), antique);
    gl.uniform3fv(u('uMetal'), COPPER_LIGHT);
    gl.uniform1i(u('uTex'), 0);
    slots.forEach(({ el }, i) => {
      const m = made[i];
      if (!m) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      gl.bindTexture(gl.TEXTURE_2D, m.tex);
      gl.uniform4f(u('uRect'), r.left - box.left, r.top - box.top, r.width, r.height);
      gl.uniform2f(u('uTexel'), 1 / m.W, 1 / m.H);
      gl.uniform1f(u('uDu'), 1 / m.s);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
  });

  return {
    antique(amount) { antique = amount; },
    dispose() {
      alive = false;
      off();
      watch.disconnect();
      for (const m of made) if (m) gl.deleteTexture(m.tex);
      gl.deleteProgram(p);
      gl.deleteBuffer(quad);
    },
  };
}
