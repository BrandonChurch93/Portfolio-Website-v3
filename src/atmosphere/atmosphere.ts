import { lamp } from '../lamp/lamp';
import { clock } from '../world/clock';
import { sweep } from '../world/contexts';
import { handheld } from '../world/device';
import { MOST, NIGHT, SHAFT, VERT, WALL } from './shaders';

// A room behind a page (Study 33): one canvas as large as the screen, fixed behind the page's things, drawn by one
// shader that is told where the cards are, where the cursor's light is and how far the page is scrolled.
export type Look = 'wall' | 'shaft' | 'night';
export const LOOKS: { name: Look; label: string }[] = [
  { name: 'wall', label: 'A · The wall' },
  { name: 'shaft', label: 'B · The shaft' },
  { name: 'night', label: 'C · The night' },
];
const FRAG: Record<Look, string> = { wall: WALL, shaft: SHAFT, night: NIGHT };
// The most device pixels to a CSS pixel each is drawn at: the wall's grain wants them, haze and a night sky do not.
const SHARP: Record<Look, number> = { wall: 1.5, shaft: 1, night: 1.5 };

export interface Atmosphere { dispose(): void }

// How far a line of type that stands off the wall throws its shadow from the cursor's light, as a share of how far
// the cursor is from it, and the most, in pixels.
const TYPE = { share: 0.035, most: 22 };

export function mountAtmosphere(host: HTMLElement, look: Look, cards: () => Element[], radius = 14, type: () => HTMLElement[] = () => []): Atmosphere | null {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const make = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(`atmosphere: ${gl.getShaderInfoLog(s)}`); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, make(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, make(gl.FRAGMENT_SHADER, FRAG[look]));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`atmosphere: ${gl.getProgramInfoLog(prog)}`);
  gl.useProgram(prog);
  const vao = gl.createVertexArray()!, buf = gl.createBuffer()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const U = { res: u('uRes'), dpr: u('uDpr'), scroll: u('uScroll'), time: u('uTime'), led: u('uLed'), lamp: u('uLamp'), cards: u('uCards[0]'), on: u('uOn[0]'), count: u('uCount'), radius: u('uRadius') };
  host.prepend(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const boxes = new Float32Array(MOST * 4), on = new Float32Array(MOST);
  // When each card's plate was first seen ready: a card comes onto the wall over as long as its plate fades in.
  const since = new WeakMap<Element, number>();
  const ARRIVE = 0.9;
  let dpr = 1, w = 1, h = 1, light = { px: innerWidth * 0.3, py: innerHeight * 0.3, led: 0 }, gone = false;
  const size = () => {
    w = innerWidth; h = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, handheld() ? 1 : SHARP[look]);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  size();
  addEventListener('resize', size);
  const offLamp = lamp.subscribe((s) => { light = { px: s.px, py: s.py, led: s.led }; });
  const off = clock.onFrame((t) => {
    if (gone || gl.isContextLost() || document.hidden) return;
    let n = 0;
    for (const el of cards()) {
      if (n >= MOST) break;
      const r = el.getBoundingClientRect();
      if (r.bottom < -400 || r.top > h + 400 || r.width < 2) continue;
      const plate = el.querySelector<HTMLElement>('[data-kind="card"]');
      let k = 1;
      if (plate) {
        if (plate.dataset.state !== 'ready') k = 0;
        else { if (!since.has(el)) since.set(el, performance.now()); k = still ? 1 : Math.min(1, (performance.now() - since.get(el)!) / 1000 / ARRIVE); }
      }
      boxes.set([r.left, r.top, r.width, r.height], n * 4);
      on[n] = k * k * (3 - 2 * k);
      n++;
    }
    for (const el of type()) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) continue;
      const dx = (r.left + r.width / 2 - light.px) * TYPE.share, dy = (r.top + r.height / 2 - light.py) * TYPE.share, far = Math.hypot(dx, dy) || 1, k = Math.min(1, TYPE.most / far);
      const sx = `${(dx * k).toFixed(1)}px`, sy = `${(dy * k).toFixed(1)}px`;
      if (el.style.getPropertyValue('--sx') !== sx) el.style.setProperty('--sx', sx);
      if (el.style.getPropertyValue('--sy') !== sy) el.style.setProperty('--sy', sy);
    }
    gl.uniform2f(U.res, w, h);
    gl.uniform1f(U.dpr, dpr);
    gl.uniform1f(U.scroll, scrollY);
    gl.uniform1f(U.time, still ? 20 : t);
    gl.uniform1f(U.led, light.led);
    gl.uniform2f(U.lamp, light.px, light.py);
    gl.uniform4fv(U.cards, boxes);
    gl.uniform1fv(U.on, on);
    gl.uniform1i(U.count, n);
    gl.uniform1f(U.radius, radius);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });

  return {
    dispose() {
      gone = true;
      off();
      offLamp();
      removeEventListener('resize', size);
      sweep(gl);
      canvas.remove();
    },
  };
}
