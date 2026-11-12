import { hex, type PaletteName } from '../config/palette';
import { lamp } from '../lamp/lamp';
import { clock } from '../world/clock';
import { LEDGE, path } from './path';
import { FRAG, VERT } from './shader';

const lin = (name: PaletteName): [number, number, number] => {
  const v = hex(name);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => Math.pow(c / 255, 2.2)) as [number, number, number];
};

const COLORS: [string, PaletteName][] = [
  ['uBg', 'bg'], ['uEmber', 'ember'], ['uFlame', 'flame'], ['uHot', 'hot'], ['uPale', 'pale'],
  ['uCopper', 'copper-light'], ['uBronze', 'bronze'], ['uBronzeDeep', 'bronze-deep'],
];

const MAX_RATIO = 2;

// Draws the same stream once in each panel, each in its own look. One WebGL context for all of them.
export function mountLooks(canvas: HTMLCanvasElement, panels: HTMLElement[], speed: () => number): () => void {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return () => undefined;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`pour looks shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, 'a');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`pour looks program: ${gl.getProgramInfoLog(prog)}`);
  gl.useProgram(prog);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const ground = lin('bg').map((c) => Math.pow(c, 1 / 2.2));
  const { ends, shape } = path();
  gl.uniform4fv(u('uEnds'), ends);
  gl.uniform4fv(u('uShape'), shape);
  gl.uniform4f(u('uLedge'), LEDGE.x, LEDGE.y, LEDGE.half, LEDGE.thick);
  gl.uniform1f(u('uTilt'), LEDGE.tilt);
  for (const [name, color] of COLORS) gl.uniform3fv(u(name), lin(color));
  const loc = { res: u('uRes'), origin: u('uOrigin'), light: u('uLight'), time: u('uTime'), turn: u('uTurn'), mode: u('uMode') };

  // A finger or a pen holds the light where it last touched. A mouse hands it back to the lamp.
  let held: { x: number; y: number } | null = null;
  const point = (e: PointerEvent) => { held = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; };
  const host = canvas.parentElement ?? canvas;
  host.addEventListener('pointerdown', point);
  host.addEventListener('pointermove', point);

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The flow runs at whatever speed is asked, without jumping when the speed changes. A frozen clock gives the same
  // frame every time.
  let flow = 0;
  const off = clock.onFrame((t, dt) => {
    flow = clock.isFrozen() ? t * speed() : flow + dt * speed();
    const box = canvas.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight || box.width < 2) return;
    const ratio = Math.min(devicePixelRatio || 1, MAX_RATIO);
    const w = Math.round(box.width * ratio), h = Math.round(box.height * ratio);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const L = lamp.get();
    const light = held ?? { x: L.px, y: L.py };
    gl.uniform1f(loc.time, still ? 2 : flow);
    gl.uniform1f(loc.turn, still ? 2 : t);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, w, h);
    gl.clearColor(ground[0], ground[1], ground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    panels.forEach((panel, mode) => {
      const r = panel.getBoundingClientRect();
      const x = Math.round((r.left - box.left) * ratio), y = Math.round((box.bottom - r.bottom) * ratio);
      const pw = Math.round(r.width * ratio), ph = Math.round(r.height * ratio);
      gl.viewport(x, y, pw, ph);
      gl.scissor(x, y, pw, ph);
      gl.uniform2f(loc.res, pw, ph);
      gl.uniform2f(loc.origin, x, y);
      gl.uniform2f(loc.light, (light.x - r.left - r.width / 2) / r.height, -(light.y - r.top - r.height / 2) / r.height);
      gl.uniform1i(loc.mode, mode);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
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
