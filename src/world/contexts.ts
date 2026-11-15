// Safari does not give a WebGL context's memory back when the context is lost or its canvas is dropped, and it keeps
// a deleted vertex buffer to use again in that context only. What it held waits for a garbage collection that
// graphics memory does not bring on. On his iPad every piece let go by the scroll, and every page left for another
// in the same tab, kept what it held until Safari ended the page ("a problem repeatedly occurred"). One thing makes
// Safari throw a context away at once: restoring it after a loss, which makes a new, empty one in its place. So every
// context the site makes is known here with everything made in it, and sweep() deletes all of that, loses the
// context, restores it when the loss arrives, and loses the empty one again. Measured in WebKit: 314 MB of buffers
// came down to 50 that way, and stayed at 310 every other way tried.

type GL = WebGL2RenderingContext | WebGLRenderingContext;
type Made = { sets: Map<string, Set<object>>; shown: boolean };

const KINDS = ['Texture', 'Renderbuffer', 'Buffer', 'Framebuffer', 'VertexArray', 'Program', 'Shader', 'Sampler', 'Query', 'TransformFeedback'] as const;
const known = new Map<GL, Made>();

function watch(gl: GL): void {
  if (known.has(gl)) return;
  const sets = new Map<string, Set<object>>();
  const own = gl as unknown as Record<string, ((...a: unknown[]) => unknown) | undefined>;
  for (const kind of KINDS) {
    const create = own[`create${kind}`], remove = own[`delete${kind}`];
    if (!create || !remove) continue;
    const set = new Set<object>();
    sets.set(kind, set);
    own[`create${kind}`] = function (this: GL, ...a: unknown[]) {
      const made = create.apply(this, a) as object | null;
      if (made) set.add(made);
      return made;
    };
    own[`delete${kind}`] = function (this: GL, ...a: unknown[]) {
      if (a[0]) set.delete(a[0] as object);
      return remove.apply(this, a);
    };
  }
  const made: Made = { sets, shown: false };
  known.set(gl, made);
  // A canvas is put on the page a moment after its context is made.
  for (const ms of [0, 200, 1000]) setTimeout(() => { if ((gl.canvas as HTMLCanvasElement).isConnected) made.shown = true; }, ms);
}

// Deletes everything made in a context, shrinks its canvas and loses it. For whoever made the context, when it is
// done with it, in place of losing it.
export function sweep(gl: GL | null | undefined): void {
  if (!gl) return;
  const made = known.get(gl);
  known.delete(gl);
  try {
    if (made && !gl.isContextLost()) {
      const g = gl as WebGL2RenderingContext;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.useProgram(null);
      g.bindVertexArray?.(null);
      const units = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) as number;
      for (let i = 0; i < units; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
        if (g.TEXTURE_3D) { gl.bindTexture(g.TEXTURE_3D, null); gl.bindTexture(g.TEXTURE_2D_ARRAY, null); }
      }
      const own = gl as unknown as Record<string, (o: object) => void>;
      for (const [kind, set] of made.sets) {
        for (const o of set) own[`delete${kind}`](o);
        set.clear();
      }
      gl.flush();
    }
    const canvas = gl.canvas, ext = gl.getExtension('WEBGL_lose_context');
    if (!ext || typeof HTMLCanvasElement === 'undefined' || !(canvas instanceof HTMLCanvasElement)) { ext?.loseContext(); return; }
    // Heard first and by nobody else: whoever made the context has finished with it and must not answer these.
    // Only the first loss is held open for a restore. Holding the last one open would keep the context waiting.
    const hear = (name: string, fn: (e: Event) => void) => canvas.addEventListener(name, (e) => { e.stopImmediatePropagation(); fn(e); }, { once: true, capture: true });
    const small = () => { canvas.width = 1; canvas.height = 1; };
    if (gl.isContextLost()) { small(); return; }
    hear('webglcontextlost', (e) => {
      e.preventDefault();
      hear('webglcontextrestored', () => {
        small();
        hear('webglcontextlost', () => undefined);
        ext.loseContext();
      });
      setTimeout(() => { try { ext.restoreContext(); } catch { small(); } }, 0);
    });
    ext.loseContext();
  } catch {
    // A context already gone has nothing left to free.
  }
}

// Sweeps every context whose canvas was on the page and no longer is: what a page that has been left never let go.
// A canvas that was never on the page, as the plates' is, is someone's own to sweep.
export function sweepGone(): void {
  for (const [gl, made] of [...known]) {
    const canvas = gl.canvas;
    if (!(canvas instanceof HTMLCanvasElement)) continue;
    if (canvas.isConnected) made.shown = true;
    else if (made.shown) sweep(gl);
  }
}

if (typeof HTMLCanvasElement !== 'undefined') {
  const proto = HTMLCanvasElement.prototype as unknown as { getContext(this: HTMLCanvasElement, ...a: unknown[]): unknown; __watched?: boolean };
  if (!proto.__watched) {
    proto.__watched = true;
    const real = proto.getContext;
    proto.getContext = function (this: HTMLCanvasElement, ...a: unknown[]) {
      const made = real.apply(this, a);
      if (made && (a[0] === 'webgl2' || a[0] === 'webgl' || a[0] === 'experimental-webgl')) watch(made as GL);
      return made;
    };
    // A page left by a full load runs no clean up of its own, and Safari may keep the whole page to come back to.
    // Everything is let go as it is hidden, and a page brought back that way is loaded again, since it has nothing
    // left to draw with.
    addEventListener('pagehide', () => { for (const gl of [...known.keys()]) sweep(gl); });
    addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
  }
}
