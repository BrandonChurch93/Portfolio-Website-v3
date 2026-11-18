import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import type { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { SMAABlendShader } from 'three/addons/shaders/SMAAShader.js';
import type { Stage } from '../../world/stage';

// The city at the screen's own density, where the world's canvas has fewer pixels than the screen: an iPad, whose
// canvas is held to HANDHELD.world for memory, or a desktop zoomed past 100 percent. What of the city never changes
// on the screen (the stone and the bays of the towers and the spire, the land, the stand ins: everything there that
// takes no glint, no time and no core) is drawn once at the screen's density, through a copy of the canvas's own
// chain, and kept as a picture in a plain 2D canvas under the world's canvas. A 2D picture costs WebKit about 9 bytes
// a pixel, where the world's canvas costs about 150 (LOG.md, Nov 16).
// The world's canvas draws those things clear, with their depth: each still material clears itself at the start of its
// own shader (own()), so its depth and anything gilded on the same face are as they were and its light is not worked
// out there, and the land, laid from the kept pictures, is cleared by a twin drawn over it a hair nearer. So the
// picture shows through, and everything else stands in front of them and behind them as it did. Not where a tree or
// anything else with a soft edge is over them: that edge is mixed with what is behind it before the tone curve, and
// over a clear pixel it would be mixed after it, a brighter fringe. There they stay as the canvas draws them.
// The picture is drawn in strips, one a frame, each read back without waiting, and shown whole once all are in. Both
// canvases cover the same box and map the same view onto it.

export interface SharpParts {
  // What never changes: drawn into the picture, and cleared in the world's canvas, each by its own material
  // (own(), before the world's programs are made). And of those, what is laid in from the kept pictures (the land),
  // which is cleared by a twin drawn over it a hair nearer.
  statics: THREE.Mesh[];
  laid: THREE.Mesh[];
  // What else is drawn round their edges, in the picture only, and only in a ring of a canvas pixel round them: where
  // the canvas clears a pixel the picture has some other thing in, that thing shows and not the page behind.
  behind: THREE.Mesh[];
  // What may stand over them with a soft edge: where any of it is, nothing is cleared.
  over: THREE.Object3D[];
  // How much of the canvas they cover, from this far down it to this far, in CSS pixels of the stage.
  band: [number, number];
  // Sets the camera to show this much of the stage, from this far down it, in its CSS pixels, or puts it back.
  view(top: number | null, tall?: number): void;
}

export interface Sharp {
  // Sets the canvas's own edge smoothing to mix a cleared pixel as the canvas holds it: again after its passes are made new.
  edges(): void;
  // What it holds, for a script: whether it is shown, the picture's size, and whether the canvas's passes are set for it.
  state(): { shown: boolean; size: [number, number]; marked: boolean; held: boolean };
  // The screen has more pixels than the canvas.
  wanted(): boolean;
  // The picture is shown, and the canvas is to clear in front of it.
  ready(): boolean;
  busy(): boolean;
  begin(parts: SharpParts): void;
  // Lets a still thing's own material clear itself where the canvas clears: called before its program is made. Drawn
  // by a twin over it, a thing gilded on the same face (the spire's gold on its stone) was cleared with it.
  own(m: THREE.Mesh): void;
  // One strip of the picture, after a frame. Or all of them, waited for.
  step(all?: boolean): void;
  // The clearing on or off, for the frame about to be drawn.
  holes(on: boolean): void;
  drop(): void;
  dispose(): void;
}

// A cleared pixel is marked by a cover under nothing, which the canvas's last two passes carry through and the screen
// reads as clear. The edge smoothing mixes two colors as light, raised to a power, and their cover straight: beside a
// clear pixel that makes a color brighter than its cover, which WebKit lays over a bright picture under it wrapped
// round, cyan specks on every edge of the city. Over the dark sky it never showed. So beside a cleared pixel the two
// are mixed straight, and a pixel next to one is held to its cover. The world's empty ground is clear too and is not
// marked: away from the city's picture the edges against the sky are mixed as they always were.
const MARK = 'gl_FragColor = s * ( e.x * e.y );';
const MARKED = 'gl_FragColor = c.a < 0.0 ? vec4( 0.0, 0.0, 0.0, - 1.0 ) : s * ( e.x * e.y );';
const BLEND = 'C.xyz = pow(C.xyz, vec3(2.2));';
const STRAIGHT = 'if ( min( C.a, Cop.a ) < 0.0 ) return mix( max( C, 0.0 ), max( Cop, 0.0 ), s );\n\t\t\t\t';
const LIGHT = 'mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));';
const HELD = `${LIGHT}
				vec2 at = texcoord - sign( offset ) * resolution;
				float least = 1.0;
				for ( int i = - 2; i <= 2; i ++ ) for ( int j = - 2; j <= 2; j ++ ) least = min( least, texture2D( colorTex, at + vec2( float( i ), float( j ) ) * resolution, 0.0 ).a );
				float most = max( mixed.r, max( mixed.g, mixed.b ) );
				if ( least < 0.0 && most > mixed.a ) mixed.rgb *= max( mixed.a, 0.0 ) / most;`;
const patch = (m: THREE.ShaderMaterial | THREE.RawShaderMaterial, from: string, to: string): boolean => {
  if (m.fragmentShader.includes(to)) return true;
  if (!m.fragmentShader.includes(from)) return false;
  m.fragmentShader = m.fragmentShader.replace(from, to);
  m.needsUpdate = true;
  return true;
};
const straight = (smaa: SMAAPass): boolean => {
  const m = (smaa as unknown as { _materialBlend: THREE.ShaderMaterial })._materialBlend;
  return patch(m, BLEND, STRAIGHT + BLEND) && patch(m, LIGHT, HELD);
};

// How many of the picture's rows a strip draws, and how many more above and below it for the edge smoothing to see.
const STRIP = { rows: 160, over: 24 };
// The trees' cover is found at this share of the canvas's density, which also spreads it by a few pixels: a tree
// sways a little.
const COVER = 0.25;

type Job = { density: number; rows: number; wide: number; next: number; pending: number; done: boolean; gone: boolean; scene?: THREE.WebGLRenderTarget; toned?: THREE.WebGLRenderTarget; out?: THREE.WebGLRenderTarget; which?: THREE.WebGLRenderTarget; smaa?: SMAAPass };
// How far round a still thing, in the picture's pixels, what is behind its edge is kept. And how far round a tree, in
// the canvas's pixels, the still things are left as the canvas draws them.
const RING = 3, KEPT = 2;

export function sharpen(stage: Stage, canvas: HTMLCanvasElement, most: number): Sharp | null {
  const finish = stage.composer.passes.find((p) => (p as ShaderPass).material?.name === 'finish') as ShaderPass | undefined;
  const source = finish?.material.fragmentShader ?? '', RIM = 'min( vUv, 1.0 - vUv )';
  if (!source.includes(RIM) || !source.includes(MARK) || typeof document === 'undefined' || !SMAABlendShader.fragmentShader.includes(BLEND) || !SMAABlendShader.fragmentShader.includes(LIGHT)) return null;
  const r = stage.renderer;
  const edges = () => {
    for (const p of stage.composer.passes) {
      if (p instanceof SMAAPass) straight(p);
      if ((p as ShaderPass).material?.name === 'finish') patch((p as ShaderPass).material, MARK, MARKED);
    }
  };
  // The picture's canvas is in the page only while there is a picture: on a screen that needs none (a desktop at its
  // own density) nothing is added to the page at all.
  let under: HTMLCanvasElement | null = null, pen: CanvasRenderingContext2D | null = null;
  const unhang = () => { if (under) { under.width = under.height = 0; under.remove(); } under = null; pen = null; };

  // The clearing: each still thing drawn again over itself, a hair nearer, clear and where no tree is.
  const cover = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const band = new THREE.Vector4(), held = new THREE.Vector4();
  // Which of the canvas's pixels keep their still things: one byte a pixel of the band, made from the trees' cover.
  let keep = new THREE.DataTexture(new Uint8Array(1), 1, 1, THREE.RedFormat, THREE.UnsignedByteType);
  const clears = new Map<THREE.Side, THREE.ShaderMaterial>();
  const clearer = (side: THREE.Side) => {
    let m = clears.get(side);
    if (!m) {
      m = new THREE.ShaderMaterial({
        uniforms: { uSharpKeep: { value: keep }, uSharpHeld: { value: held } },
        vertexShader: 'void main() { vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * mvPosition; }',
        fragmentShader: 'uniform sampler2D uSharpKeep; uniform vec4 uSharpHeld; void main() { if ( texture2D( uSharpKeep, vec2( gl_FragCoord.x * uSharpHeld.x, ( uSharpHeld.y - gl_FragCoord.y - uSharpHeld.z ) * uSharpHeld.w ) ).r > 0.5 ) discard; gl_FragColor = vec4( 0.0, 0.0, 0.0, - 1.0 ); }',
        side, depthWrite: false, depthFunc: THREE.LessEqualDepth, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -8, toneMapped: false,
      });
      clears.set(side, m);
    }
    return m;
  };
  // A still material clears itself at the very start of its own shader, so its depth and what stands on the same face
  // are as they always were, and its own light is not worked out where the picture shows instead.
  const on = { value: 0 }, keeps = { value: keep };
  const owned = new WeakSet<THREE.Material>();
  const own = (mesh: THREE.Mesh) => {
    for (const m of [mesh.material].flat()) {
      if (owned.has(m)) continue;
      owned.add(m);
      const was = m.onBeforeCompile, key = m.customProgramCacheKey;
      m.onBeforeCompile = (sh, renderer) => {
        was.call(m, sh, renderer);
        Object.assign(sh.uniforms, { uSharpKeep: keeps, uSharpHeld: { value: held }, uSharpOn: on });
        sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform sampler2D uSharpKeep; uniform vec4 uSharpHeld; uniform float uSharpOn;\nvoid main() {\n\tif ( uSharpOn > 0.5 && texture2D( uSharpKeep, vec2( gl_FragCoord.x * uSharpHeld.x, ( uSharpHeld.y - gl_FragCoord.y - uSharpHeld.z ) * uSharpHeld.w ) ).r < 0.5 ) { gl_FragColor = vec4( 0.0, 0.0, 0.0, - 1.0 ); return; }');
      };
      m.customProgramCacheKey = () => `${key.call(m)}:sharp`;
      m.needsUpdate = true;
    }
  };
  const twins = new THREE.Group();
  twins.visible = false;
  twins.matrixAutoUpdate = false;
  stage.scene.add(twins);
  // So that their program is made with the rest before the first frame, and not in the frame that first needs it.
  const ahead: THREE.Mesh[] = [THREE.FrontSide, THREE.DoubleSide, THREE.BackSide].map((side) => {
    const m = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(9).fill(0), 3)), clearer(side));
    m.frustumCulled = false;
    m.visible = false;
    stage.scene.add(m);
    return m;
  });

  // Which of the picture's pixels a still thing is in front in: the still things white, the rest black.
  const flats = new Map<string, THREE.ShaderMaterial>();
  const flat = (side: THREE.Side, on: boolean) => {
    const key = `${side}${on}`;
    let m = flats.get(key);
    if (!m) {
      m = new THREE.ShaderMaterial({ vertexShader: 'void main() { vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * mvPosition; }', fragmentShader: `void main() { gl_FragColor = vec4( ${on ? '1.0' : '0.0'} ); }`, side, toneMapped: false });
      flats.set(key, m);
    }
    return m;
  };
  for (const side of [THREE.FrontSide, THREE.DoubleSide, THREE.BackSide]) for (const on of [true, false]) {
    const m = new THREE.Mesh(ahead[0].geometry, flat(side, on));
    m.frustumCulled = false;
    m.visible = false;
    stage.scene.add(m);
    ahead.push(m);
  }

  const tone = new THREE.RawShaderMaterial({
    uniforms: { tDiffuse: { value: null }, toneMappingExposure: { value: 1 }, uRim: { value: new THREE.Vector4(0, 0, 1, 1) } },
    vertexShader: 'precision highp float; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform vec4 uRim; attribute vec3 position; attribute vec2 uv; varying vec2 vUv; varying vec2 vRim; void main() { vUv = uv; vRim = uRim.xy + uv * uRim.zw; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: source.replace('varying vec2 vUv;', 'varying vec2 vUv;\nvarying vec2 vRim;').replace(RIM, 'min( vRim, 1.0 - vRim )'),
  });
  const quad = new FullScreenQuad(tone);

  let parts: SharpParts | null = null, job: Job | null = null, shown = false;
  // Which of the canvas's pixels in the band clear nothing because a tree is near: where the trees' cover is, spread by
  // KEPT pixels so that the edges the canvas draws there, which may be brighter than their cover, lie over no picture.
  // Under those the picture is left empty: a picture under such an edge is what WebKit wraps round.
  let shut: { wide: number; top: number; tall: number; at: Uint8Array } | null = null, shutting: Promise<void> | null = null, made = 0;
  const spread = (px: Uint8Array, cw: number, ch: number) => {
    const read = stage.composer.readBuffer, W = read.width, H = read.height, k = H / stage.height, b = parts!.band;
    const top = Math.floor(b[0] * k), tall = Math.ceil(b[1] * k) - top, at = new Uint8Array(W * tall);
    const texel = (u: number, v: number) => px[(Math.min(ch - 1, Math.max(0, v)) * cw + Math.min(cw - 1, Math.max(0, u))) * 4 + 3] / 255;
    const seen = new Uint8Array(W * tall);
    for (let y = 0; y < tall; y++) {
      const v = ((H - (top + y) - 0.5 - band.y) * band.z) * ch - 0.5, v0 = Math.floor(v), fv = v - v0;
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) * band.x * cw - 0.5, u0 = Math.floor(u), fu = u - u0;
        const a = (texel(u0, v0) * (1 - fu) + texel(u0 + 1, v0) * fu) * (1 - fv) + (texel(u0, v0 + 1) * (1 - fu) + texel(u0 + 1, v0 + 1) * fu) * fv;
        if (a > 0.002) seen[y * W + x] = 1;
      }
    }
    for (let y = 0; y < tall; y++) for (let x = 0; x < W; x++) {
      if (!seen[y * W + x]) continue;
      for (let v = Math.max(0, y - KEPT); v <= Math.min(tall - 1, y + KEPT); v++) at.fill(1, v * W + Math.max(0, x - KEPT), v * W + Math.min(W, x + KEPT + 1));
    }
    keep.dispose();
    keep = new THREE.DataTexture(at.map((v) => v * 255), W, tall, THREE.RedFormat, THREE.UnsignedByteType);
    keep.magFilter = keep.minFilter = THREE.NearestFilter;
    keep.unpackAlignment = 1;
    keep.needsUpdate = true;
    for (const m of clears.values()) m.uniforms.uSharpKeep.value = keep;
    keeps.value = keep;
    held.set(1 / W, H, top, 1 / tall);
    shut = { wide: W, top, tall, at };
  };
  const drawn = (o: THREE.Object3D) => (o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Sprite).isSprite || (o as THREE.Line).isLine;
  const sideOf = (m: THREE.Mesh): THREE.Side => (Array.isArray(m.material) ? m.material[0] : m.material).side;

  // Draws only these, into a target, with the camera on this much of the stage, and puts everything back.
  const alone = (what: THREE.Object3D[], target: THREE.WebGLRenderTarget, top: number, tall: number) => {
    const was = new Map<THREE.Object3D, boolean>(), clearing = on.value;
    on.value = 0;
    stage.scene.traverse((o) => { if (o !== stage.scene) was.set(o, o.visible); });
    stage.scene.traverse((o) => { if (drawn(o)) o.visible = false; });
    for (const o of what) {
      for (let x: THREE.Object3D | null = o.parent; x && x !== stage.scene; x = x.parent) x.visible = true;
      o.traverse((c) => { c.visible = true; });
    }
    const prev = r.getRenderTarget(), clear = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha(), auto = r.autoClear;
    parts!.view(top, tall);
    r.autoClear = true;
    r.setClearColor(0x000000, 0);
    target.scissorTest = false;
    r.setRenderTarget(target);
    r.render(stage.scene, stage.camera);
    parts!.view(null);
    r.setClearColor(clear, alpha);
    r.autoClear = auto;
    r.setRenderTarget(prev);
    for (const [o, v] of was) o.visible = v;
    on.value = clearing;
  };

  const density = (): number => {
    const tall = parts ? parts.band[1] - parts.band[0] : stage.height;
    return Math.min(3, devicePixelRatio || 1, Math.sqrt(most / Math.max(1, stage.width * tall)));
  };
  const free = () => {
    if (!job) return;
    job.gone = true;
    job.scene?.dispose(); job.toned?.dispose(); job.out?.dispose(); job.which?.dispose(); job.smaa?.dispose();
    job = null;
  };

  const strip = (j: Job, all: boolean) => {
    const p = parts!, at = j.next, rows = Math.min(STRIP.rows, j.rows - at);
    j.next += rows;
    const over0 = Math.min(STRIP.over, at), over1 = Math.min(STRIP.over, j.rows - at - rows), tall = over0 + rows + over1;
    if (!j.scene || j.scene.height !== tall) {
      j.scene?.dispose(); j.toned?.dispose(); j.out?.dispose(); j.which?.dispose();
      j.which = new THREE.WebGLRenderTarget(j.wide, tall);
      j.scene = new THREE.WebGLRenderTarget(j.wide, tall, { type: THREE.HalfFloatType });
      j.toned = new THREE.WebGLRenderTarget(j.wide, tall, { type: THREE.HalfFloatType, depthBuffer: false });
      j.out = new THREE.WebGLRenderTarget(j.wide, tall, { depthBuffer: false });
      if (!j.smaa) { j.smaa = new SMAAPass(); straight(j.smaa); }
      j.smaa.setSize(j.wide, tall);
    }
    // The strip's place on the stage, in its CSS pixels, and in the share of the canvas the fade at its rim reads.
    const top = p.band[0] + (at - over0) / j.density, span = tall / j.density;
    alone([...p.statics, ...p.behind], j.scene, top, span);
    const was = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    for (const m of p.statics) { was.set(m, m.material); m.material = flat(sideOf(m), true); }
    for (const m of p.behind) { was.set(m, m.material); m.material = flat(sideOf(m), false); }
    alone([...p.statics, ...p.behind], j.which!, top, span);
    for (const [m, mat] of was) m.material = mat;
    tone.uniforms.tDiffuse.value = j.scene.texture;
    tone.uniforms.toneMappingExposure.value = r.toneMappingExposure;
    tone.uniforms.uRim.value.set(0, 1 - (top + span) / stage.height, 1, span / stage.height);
    const prev = r.getRenderTarget();
    j.toned!.scissorTest = j.out!.scissorTest = false;
    r.setRenderTarget(j.toned!);
    quad.render(r);
    const smaa = j.smaa!;
    smaa.renderToScreen = false;
    smaa.render(r, j.out!, j.toned!, 0, false);
    r.setRenderTarget(prev);
    const buf = new Uint8Array(j.wide * rows * 4), r0 = Math.max(0, over1 - RING), r1 = Math.min(tall, over1 + rows + RING), seen = new Uint8Array(j.wide * (r1 - r0) * 4);
    // Whether a pixel of the strip has a still thing within the ring, rows counted down from the strip's own top.
    const near = new Uint8Array(j.wide * rows);
    const ring = () => {
      const n = r1 - r0, lit = (x: number, y: number) => seen[((n - 1 - y) * j.wide + x) * 4] > 127;
      const across = new Uint8Array(j.wide * n);
      for (let y = 0; y < n; y++) for (let x = 0, last = -1e9; x < j.wide; x++) { if (lit(x, y)) last = x; if (x - last <= RING) across[y * j.wide + x] = 1; }
      for (let y = 0; y < n; y++) for (let x = j.wide - 1, last = 1e9; x >= 0; x--) { if (lit(x, y)) last = x; if (last - x <= RING) across[y * j.wide + x] = 1; }
      const skip = (r0 + n) - (over1 + rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < j.wide; x++) {
        const c = y + skip;
        for (let v = Math.max(0, c - RING); v <= Math.min(n - 1, c + RING); v++) if (across[v * j.wide + x]) { near[y * j.wide + x] = 1; break; }
      }
    };
    const put = (): void => {
      if (j.gone) return;
      if (!shut) { void shutting?.then(put); return; }
      if (!pen) return;
      const img = pen.createImageData(j.wide, rows), d = img.data, W = j.wide * 4, sh = shut!;
      const kx = sh.wide / stage.width / j.density, ky = stage.composer.readBuffer.height / stage.height;
      // Read bottom up, and with its color multiplied by its cover, as the canvas holds it.
      for (let y = 0; y < rows; y++) {
        const from = (rows - 1 - y) * W, to = y * W, row = Math.min(sh.tall - 1, Math.max(0, Math.floor((p.band[0] + (at + y + 0.5) / j.density) * ky) - sh.top)) * sh.wide;
        for (let x = 0; x < W; x += 4) {
          const a = buf[from + x + 3];
          if (!a || !near[y * j.wide + x / 4] || sh.at[row + Math.min(sh.wide - 1, Math.floor((x / 4 + 0.5) * kx))]) continue;
          const k = 255 / a;
          d[to + x] = Math.min(255, Math.round(buf[from + x] * k));
          d[to + x + 1] = Math.min(255, Math.round(buf[from + x + 1] * k));
          d[to + x + 2] = Math.min(255, Math.round(buf[from + x + 2] * k));
          d[to + x + 3] = a;
        }
      }
      pen.putImageData(img, 0, at);
      if (--j.pending === 0 && j.next >= j.rows) j.done = true;
    };
    j.pending++;
    if (all) { r.readRenderTargetPixels(j.which!, 0, r0, j.wide, r1 - r0, seen); ring(); r.readRenderTargetPixels(j.out!, 0, over1, j.wide, rows, buf); put(); }
    else {
      const lost = () => { j.gone = true; };
      const seenAt = r.readRenderTargetPixelsAsync(j.which!, 0, r0, j.wide, r1 - r0, seen);
      const bufAt = r.readRenderTargetPixelsAsync(j.out!, 0, over1, j.wide, rows, buf);
      Promise.all([seenAt, bufAt]).then(() => { ring(); put(); }, lost);
    }
  };

  const holes = (yes: boolean) => { twins.visible = yes && shown; on.value = twins.visible ? 1 : 0; };

  return {
    own,
    edges,
    state: () => ({
      shown,
      size: [under?.width ?? 0, under?.height ?? 0],
      marked: stage.composer.passes.some((p) => (p as ShaderPass).material?.fragmentShader?.includes(MARKED)),
      held: stage.composer.passes.some((p) => p instanceof SMAAPass && (p as unknown as { _materialBlend: THREE.ShaderMaterial })._materialBlend.fragmentShader.includes(HELD)),
    }),
    wanted: () => (devicePixelRatio || 1) > r.getPixelRatio() * 1.02,
    ready: () => shown,
    busy: () => !!job && !shown,
    begin(p) {
      this.drop();
      parts = p;
      const d = density();
      if (d <= r.getPixelRatio() * 1.02) { parts = null; return; }
      edges();
      const rows = Math.max(1, Math.round((p.band[1] - p.band[0]) * d)), wide = Math.max(1, Math.round(stage.width * d));
      under = document.createElement('canvas');
      under.setAttribute('aria-hidden', 'true');
      under.style.cssText = 'position:absolute;left:0;width:100%;display:block;z-index:-1;pointer-events:none;visibility:hidden';
      under.width = wide;
      under.height = rows;
      pen = under.getContext('2d');
      if (!pen) { unhang(); parts = null; return; }
      canvas.after(under);
      under.style.top = `${(100 * p.band[0]) / stage.height}%`;
      under.style.height = `${(100 * rows) / d / stage.height}%`;
      // The twins that clear, and the trees' cover in the band, at a quarter of the canvas's density.
      for (const m of p.laid) {
        m.updateWorldMatrix(true, false);
        const t = new THREE.Mesh(m.geometry, clearer(sideOf(m)));
        t.matrixAutoUpdate = false;
        t.matrix.copy(m.matrixWorld);
        t.matrixWorld.copy(m.matrixWorld);
        t.frustumCulled = m.frustumCulled;
        t.renderOrder = 1e6;
        twins.add(t);
      }
      const read = stage.composer.readBuffer, W = read.width, H = read.height, k = H / stage.height;
      cover.setSize(Math.max(1, Math.ceil(W * COVER)), Math.max(1, Math.ceil((p.band[1] - p.band[0]) * k * COVER)));
      if (p.over.length) alone(p.over, cover, p.band[0], p.band[1] - p.band[0]);
      else { const prev = r.getRenderTarget(), clear = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha(); r.setRenderTarget(cover); r.setClearColor(0x000000, 0); r.clear(); r.setClearColor(clear, alpha); r.setRenderTarget(prev); }
      const cw = cover.width, ch = cover.height, px = new Uint8Array(cw * ch * 4);
      shut = null;
      const one = ++made;
      shutting = r.readRenderTargetPixelsAsync(cover, 0, 0, cw, ch, px).then(() => { if (one === made && !shut) spread(px, cw, ch); }, () => { if (one === made && job) job.gone = true; });
      band.set(1 / W, H - p.band[1] * k, 1 / ((p.band[1] - p.band[0]) * k), 0);
      job = { density: d, rows, wide, next: 0, pending: 0, done: false, gone: false };
    },
    step(all = false) {
      const j = job;
      if (!j || shown || !parts) return;
      if (j.gone) { this.drop(); return; }
      if (all && !shut) { const cw = cover.width, ch = cover.height, px = new Uint8Array(cw * ch * 4); r.readRenderTargetPixels(cover, 0, 0, cw, ch, px); spread(px, cw, ch); }
      if (all) while (j.next < j.rows) strip(j, true);
      else if (j.next < j.rows) strip(j, false);
      if (!j.done) return;
      j.scene?.dispose(); j.toned?.dispose(); j.out?.dispose(); j.which?.dispose(); j.smaa?.dispose();
      j.scene = j.toned = j.out = j.which = j.smaa = undefined;
      shown = true;
      if (under) under.style.visibility = 'visible';
    },
    holes,
    drop() {
      free();
      shown = false;
      holes(false);
      parts = null;
      for (const t of [...twins.children]) twins.remove(t);
      unhang();
    },
    dispose() {
      this.drop();
      stage.scene.remove(twins);
      for (const m of ahead) { stage.scene.remove(m); m.geometry.dispose(); }
      for (const m of clears.values()) m.dispose();
      for (const m of flats.values()) m.dispose();
      cover.dispose();
      keep.dispose();
      tone.dispose();
      quad.dispose();
      unhang();
    },
  };
}
