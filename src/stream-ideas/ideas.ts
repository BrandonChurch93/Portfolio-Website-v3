import { lamp } from '../lamp/lamp';
import { clock } from '../world/clock';
import { GROUND, MAX_RATIO, program, type GL, type Program } from './gl';
import { ASPECT, BRANCHES, SAMPLES, clear, place, seeded } from './route';
import * as S from './shaders';

const STRANDS = 420; // to each branch
const SPREAD = 2.3; // how much wider than the route's own width the threads fan
const LEAVES = 4500; // to each branch
const GRID = { w: 120, h: 192 }; // the ink's flow
const INK = { w: 360, h: 576 }; // the ink itself, finer than the flow that carries it
const WARM_STEPS = 560; // for a frozen clock: run this far, then hold, so a still is always the same

interface Target { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number }

// Three ideas for the stream, one to a panel, on one WebGL context: threads, copper leaf, ink.
export function mountIdeas(canvas: HTMLCanvasElement, panels: HTMLElement[], speed: () => number): () => void {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false }) as GL | null;
  if (!gl) return () => undefined;
  const canFloat = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

  const make = (vs: string, fs: string, attribs?: string[]) => program(gl, vs, fs, attribs);
  type Prog = Program;

  const quad = gl.createVertexArray()!;
  gl.bindVertexArray(quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const target = (w: number, h: number, float: boolean): Target => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h };
  };
  const pair = (w: number, h: number) => {
    const d = { read: target(w, h, true), write: target(w, h, true), swap() { const r = d.read; d.read = d.write; d.write = r; } };
    return d;
  };
  const bind = (unit: number, t: Target, loc: WebGLUniformLocation | null) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform1i(loc, unit);
  };
  // Draws one program over the whole of a target, or over a panel of the canvas when there is no target.
  const pass = (prog: Prog, dst: Target | null, set: () => void) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null);
    if (dst) { gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, dst.w, dst.h); }
    gl.useProgram(prog.p);
    if (dst) gl.uniform2f(prog.u('uSize'), dst.w, dst.h);
    set();
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // ---- threads
  const threadDraw = make(S.THREAD_VERT, S.THREAD_FRAG, ['aPos', 'aNrm', 'aAlong']);
  const threadShow = make(S.QUAD, S.THREAD_SHOW);
  const rnd = seeded(7);
  const lines: number[] = [];
  for (const b of BRANCHES) {
    for (let i = 0; i < STRANDS; i++) {
      const lat = (rnd() + rnd() - 1) * (rnd() < 0.06 ? 1.9 : 1);
      const a1 = (rnd() - 0.5) * 0.9, f1 = 1 + rnd() * 2.5, p1 = rnd();
      const a2 = (rnd() - 0.5) * 0.5, f2 = 4 + rnd() * 5, p2 = rnd();
      const own = rnd();
      let last: number[] | null = null;
      for (let k = 0; k < SAMPLES; k++) {
        const s = k / (SAMPLES - 1);
        const [x, y] = clear(...place(b, s, SPREAD * (lat + a1 * Math.sin(6.283 * (f1 * s + p1)) + a2 * Math.sin(6.283 * (f2 * s + p2)))));
        const v = [x, y, b.nx[k], b.ny[k], s, own];
        if (last) lines.push(...last, ...v);
        last = v;
      }
    }
  }
  const lineCount = lines.length / 6;
  const lineArray = gl.createVertexArray()!;
  gl.bindVertexArray(lineArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
  for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 2, gl.FLOAT, false, 24, i * 8); }
  let count: Target | null = null;

  // ---- copper leaf
  const sceneShow = make(S.QUAD, S.SCENE_SHOW);
  const leafDraw = make(S.LEAF_VERT, S.LEAF_FRAG, ['aCorner', 'aLeaf', 'aTurn']);
  const lr = seeded(11);
  const leaves = Array.from({ length: LEAVES * 2 }, (_, i) => ({
    b: BRANCHES[i < LEAVES ? 0 : 1], at: lr(), pace: 0.7 + 0.6 * lr(), lat: (lr() + lr() + lr() - 1.5) * 1.7, size: 0.002 + 0.0036 * lr() * lr(),
    ang: lr() * 6.283, spin: (lr() - 0.5) * 2.4, tilt: lr() * 6.283, tumble: 0.6 + 2.2 * lr(), own: lr(), sway: 0.5 + lr(),
  }));
  const leafData = new Float32Array(leaves.length * 6);
  const leafArray = gl.createVertexArray()!;
  gl.bindVertexArray(leafArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const leafBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, leafBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, leafData.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
  gl.vertexAttribDivisor(2, 1);

  // ---- ink
  const ink = canFloat ? {
    advect: make(S.QUAD, S.INK_ADVECT), add: make(S.QUAD, S.INK_ADD), force: make(S.QUAD, S.INK_FORCE), spread: make(S.QUAD, S.INK_SPREAD),
    press: make(S.QUAD, S.INK_PRESS), level: make(S.QUAD, S.INK_LEVEL), show: make(S.QUAD, S.INK_SHOW),
    vel: pair(GRID.w, GRID.h), dye: pair(INK.w, INK.h), pressure: pair(GRID.w, GRID.h), spreadOut: target(GRID.w, GRID.h, true),
  } : null;
  let warmed = false;

  const step = (dt: number, stir: [number, number, number, number] | null) => {
    if (!ink) return;
    const add = (to: ReturnType<typeof pair>, x: number, y: number, value: [number, number, number, number], wide: number) => {
      pass(ink.add, to.write, () => {
        bind(0, to.read, ink.add.u('uSrc'));
        gl.uniform2f(ink.add.u('uAt'), x, y);
        gl.uniform4fv(ink.add.u('uAdd'), value);
        gl.uniform1f(ink.add.u('uWide'), wide);
      });
      to.swap();
    };
    pass(ink.advect, ink.vel.write, () => {
      bind(0, ink.vel.read, ink.advect.u('uVel'));
      bind(1, ink.vel.read, ink.advect.u('uSrc'));
      gl.uniform1f(ink.advect.u('uDt'), dt);
      gl.uniform1f(ink.advect.u('uKeep'), Math.exp(-0.12 * dt));
      gl.uniform1f(ink.advect.u('uDrain'), 0);
    });
    ink.vel.swap();
    add(ink.vel, 0, 0.47, [0, -3.4 * dt, 0, 0], 0.0006);
    add(ink.dye, 0, 0.47, [5.5 * dt, 0, 0, 0], 0.00035);
    if (stir) add(ink.vel, stir[0], stir[1], [stir[2], stir[3], 0, 0], 0.0014);
    pass(ink.force, ink.vel.write, () => {
      bind(0, ink.vel.read, ink.force.u('uVel'));
      bind(1, ink.dye.read, ink.force.u('uInk'));
      gl.uniform1f(ink.force.u('uDt'), dt);
      gl.uniform1f(ink.force.u('uSink'), 2.0);
      gl.uniform1f(ink.force.u('uSwirl'), 9);
    });
    ink.vel.swap();
    pass(ink.spread, ink.spreadOut, () => bind(0, ink.vel.read, ink.spread.u('uVel')));
    for (let i = 0; i < 18; i++) {
      pass(ink.press, ink.pressure.write, () => {
        bind(0, ink.pressure.read, ink.press.u('uPress'));
        bind(1, ink.spreadOut, ink.press.u('uSpread'));
      });
      ink.pressure.swap();
    }
    pass(ink.level, ink.vel.write, () => {
      bind(0, ink.pressure.read, ink.level.u('uPress'));
      bind(1, ink.vel.read, ink.level.u('uVel'));
    });
    ink.vel.swap();
    pass(ink.advect, ink.dye.write, () => {
      bind(0, ink.vel.read, ink.advect.u('uVel'));
      bind(1, ink.dye.read, ink.advect.u('uSrc'));
      gl.uniform1f(ink.advect.u('uDt'), dt);
      // Ink fades in a few seconds, so what shows is the fresh stream and not everything it has ever shed.
      gl.uniform1f(ink.advect.u('uKeep'), Math.exp(-0.55 * dt));
      gl.uniform1f(ink.advect.u('uDrain'), 1);
    });
    ink.dye.swap();
  };

  // A finger or a pen holds the light where it last touched. A mouse hands it back to the lamp.
  let held: { x: number; y: number } | null = null;
  const point = (e: PointerEvent) => { held = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; };
  const host = canvas.parentElement ?? canvas;
  host.addEventListener('pointerdown', point);
  host.addEventListener('pointermove', point);

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let flow = 0;
  let stirFrom: [number, number] | null = null;

  const off = clock.onFrame((t, dt) => {
    const box = canvas.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight || box.width < 2 || panels.length < 3) return;
    const ratio = Math.min(devicePixelRatio || 1, MAX_RATIO);
    const w = Math.round(box.width * ratio), h = Math.round(box.height * ratio);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const held_ = clock.isFrozen() || still;
    flow = still ? 2 : clock.isFrozen() ? t * speed() : flow + dt * speed();
    const turn = still ? 2 : t;
    const L = lamp.get();
    const light = held ?? { x: L.px, y: L.py };
    const frames = panels.map((panel) => {
      const r = panel.getBoundingClientRect();
      return {
        x: Math.round((r.left - box.left) * ratio), y: Math.round((box.bottom - r.bottom) * ratio), w: Math.round(r.width * ratio), h: Math.round(r.height * ratio),
        lx: (light.x - r.left - r.width / 2) / r.height, ly: -(light.y - r.top - r.height / 2) / r.height,
      };
    });
    const onPanel = (prog: Prog, f: (typeof frames)[number]) => {
      gl.enable(gl.SCISSOR_TEST);
      gl.viewport(f.x, f.y, f.w, f.h);
      gl.scissor(f.x, f.y, f.w, f.h);
      gl.uniform2f(prog.u('uRes'), f.w, f.h);
      gl.uniform2f(prog.u('uOrigin'), f.x, f.y);
      gl.uniform2f(prog.u('uLight'), f.lx, f.ly);
    };

    // Threads: count the strands over each pixel, then color by how many.
    const A = frames[0];
    if (!count || count.w !== A.w || count.h !== A.h) {
      if (count) { gl.deleteTexture(count.tex); gl.deleteFramebuffer(count.fbo); }
      count = target(A.w, A.h, false);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, count.fbo);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, A.w, A.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(threadDraw.p);
    gl.uniform1f(threadDraw.u('uTime'), flow);
    gl.uniform1f(threadDraw.u('uTurn'), turn);
    gl.uniform2f(threadDraw.u('uLight'), A.lx, A.ly);
    gl.bindVertexArray(lineArray);
    gl.drawArrays(gl.LINES, 0, lineCount);
    gl.disable(gl.BLEND);

    // Ink: move the fluid on, off screen, before anything is drawn to the canvas.
    const C = frames[2];
    if (ink) {
      if (held_) {
        if (!warmed) { for (let i = 0; i < WARM_STEPS; i++) step(1 / 60, null); warmed = true; }
      } else {
        const inPanel = Math.abs(C.lx) < ASPECT / 2 && Math.abs(C.ly) < 0.5;
        let stir: [number, number, number, number] | null = null;
        if (stirFrom && inPanel && dt > 0) {
          const k = 0.25 / dt, cap = (v: number) => Math.max(-1.2, Math.min(1.2, v));
          stir = [C.lx, C.ly, cap((C.lx - stirFrom[0]) * k), cap((C.ly - stirFrom[1]) * k)];
        }
        stirFrom = [C.lx, C.ly];
        const simDt = Math.min(dt, 1 / 30) * speed() * 2.2;
        if (simDt > 0) step(simDt, stir);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, w, h);
    gl.clearColor(GROUND[0], GROUND[1], GROUND[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    pass(threadShow, null, () => { onPanel(threadShow, A); bind(0, count!, threadShow.u('uCount')); });

    // Copper leaf: every shard is placed along the route, turned, and drawn as its own piece of lit metal.
    const B = frames[1];
    pass(sceneShow, null, () => onPanel(sceneShow, B));
    for (let i = 0; i < leaves.length; i++) {
      const f = leaves[i];
      const s = (f.at + flow * 0.2 * f.pace) % 1;
      const [x, y] = clear(...place(f.b, s, f.lat + 0.3 * Math.sin(turn * f.sway + f.own * 40)));
      leafData.set([x, y, f.size, f.ang + turn * f.spin, f.tilt + turn * f.tumble, f.own], i * 6);
    }
    gl.useProgram(leafDraw.p);
    onPanel(leafDraw, B);
    gl.bindVertexArray(leafArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, leafBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, leafData);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, leaves.length);
    gl.disable(gl.BLEND);

    if (ink) pass(ink.show, null, () => { onPanel(ink.show, C); bind(0, ink.dye.read, ink.show.u('uInk')); gl.uniform2f(ink.show.u('uInkSize'), INK.w, INK.h); });
    else pass(sceneShow, null, () => onPanel(sceneShow, C));
  });

  // The context is left alive: React mounts twice in development, and a canvas whose context was lost hands the
  // lost one back.
  return () => {
    off();
    host.removeEventListener('pointerdown', point);
    host.removeEventListener('pointermove', point);
  };
}
