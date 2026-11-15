import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Tier } from '../config/site';
import { site } from '../content/site';
import { pixelRatioFor } from './tier-choice';
import { pause, seeded } from './build';
import { clock } from './clock';
import { studioScene } from './env';

// What every piece shares: renderer, Neutral tone mapping, soft shadows, a studio environment, the post chain, the
// lamp as a real light, and the "how this is made" view. One stage per piece, one WebGL context each.

export interface StageOptions {
  tier: Tier;
  fov?: number;
  near?: number;
  far?: number;
  bloom?: { strength: number; threshold: number; radius: number };
  ao?: number;
  aoIntensity?: number;
  envIntensity?: number;
  lampTarget?: [number, number, number];
  lampAngle?: number;
  exposure?: number;
  // The environment metal reflects: the neutral room, a studio of soft lights for pieces made mostly of metal, or a
  // room a piece builds itself.
  env?: 'room' | 'studio' | (() => THREE.Scene);
  // For a canvas as large as the screen, where the tier's own numbers cost more than a frame has: how many samples
  // the occlusion and its denoise take at the high tier, the share of the canvas's pixels the occlusion is worked
  // out at, and the share the bloom is.
  aoSamples?: number;
  aoScale?: number;
  bloomScale?: number;
}

const TIER_POST: Record<Tier, { ao: boolean; aoScale: number; shadow: number; smaa: boolean }> = {
  high: { ao: true, aoScale: 0.6, shadow: 2048, smaa: true },
  mid: { ao: true, aoScale: 0.5, shadow: 1024, smaa: true },
  low: { ao: false, aoScale: 0, shadow: 1024, smaa: false },
  static: { ao: true, aoScale: 0.5, shadow: 2048, smaa: true },
};

// Seeded so the occlusion denoise draws the same pixels on every load: a frozen frame is always the same image.
function seededNoise(size = 64): THREE.DataTexture {
  const r = seeded(4242);
  const simplex = new SimplexNoise({ random: r });
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
    const k = (i * size + j) * 4;
    data[k] = (simplex.noise(i, j) * 0.5 + 0.5) * 255;
    data[k + 1] = (simplex.noise(i + size, j) * 0.5 + 0.5) * 255;
    data[k + 2] = (simplex.noise(i, j + size) * 0.5 + 0.5) * 255;
    data[k + 3] = (simplex.noise(i + size, j + size) * 0.5 + 0.5) * 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// Last pass: a fixed pattern of half-level noise, so dark glows fade smoothly instead of stepping through 8-bit
// levels. Fixed per pixel, so a frozen frame is still the same image. Where a piece draws nothing on a clear ground
// there is no noise either: on a canvas the page shows through, it would be a faint rectangle of grain.
export const DITHER = 'dither';
function ditherPass(): ShaderPass {
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); } void main(){ vec4 c = texture2D(tDiffuse, vUv); float n = h(gl_FragCoord.xy) + h(gl_FragCoord.xy + 17.0) - 1.0; gl_FragColor = vec4(c.rgb + n / 255.0 * step(0.002, max(c.a, max(c.r, max(c.g, c.b)))), c.a); }',
  });
  pass.material.name = DITHER;
  return pass;
}

// How many vertices warm() sends to the GPU at a time when it is paced.
const DRAW_AHEAD = 40000;

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  renderPass: RenderPass;
  lamp: THREE.SpotLight;
  private ao: GTAOPass | null = null;
  bloom: UnrealBloomPass;
  private smaa: SMAAPass | null = null;
  private envRT: THREE.WebGLRenderTarget;
  private making = false;
  private exposureBefore = 1;
  // Triangles per square unit of a part's bounding sphere above which its wire is left out of the making view.
  wireDensity = Infinity;
  // When set, the making view draws edges sharper than this many degrees instead of every triangle, so flat faces
  // show their outline and not their triangulation.
  wireEdges = 0;
  private wire: THREE.Object3D[] = [];
  private stats: HTMLDivElement;
  tier: Tier;
  width = 1;
  height = 1;
  frameMs = 0;
  // A factor on the tier's pixel ratio, for moments in motion where full resolution is not needed.
  private resScale = 1;

  constructor(private host: HTMLElement, private canvas: HTMLCanvasElement, private o: StageOptions) {
    this.tier = o.tier;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = o.exposure ?? 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x0c0a09, 0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = typeof o.env === 'function' ? o.env() : o.env === 'studio' ? studioScene() : new RoomEnvironment();
    this.envRT = pmrem.fromScene(envScene, 0.04);
    envScene.traverse((x) => { if (x instanceof THREE.Mesh) { x.geometry.dispose(); (x.material as THREE.Material).dispose(); } });
    pmrem.dispose();
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = o.envIntensity ?? 0.2;
    this.camera = new THREE.PerspectiveCamera(o.fov ?? 32, 1, o.near ?? 0.05, o.far ?? 30);

    // The lamp is a wide, soft spot aimed at the piece: it lights like a bulb in front of it, and its shadows take one
    // map instead of a point light's six.
    this.lamp = new THREE.SpotLight(0xffdcb4, 3.2, 0, o.lampAngle ?? 1.15, 0.7, 2);
    this.lamp.target.position.set(...(o.lampTarget ?? [0, 0, 0]));
    this.scene.add(this.lamp.target);
    this.lamp.castShadow = true;
    this.lamp.shadow.bias = -0.0012;
    this.lamp.shadow.normalBias = 0.003;
    this.lamp.shadow.radius = 5;
    this.lamp.shadow.camera.near = 0.03;
    this.lamp.shadow.camera.far = 8;
    this.scene.add(this.lamp);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    const b = o.bloom ?? { strength: 0.22, threshold: 1.1, radius: 0.4 };
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), b.strength, b.radius, b.threshold);
    if (o.bloomScale) {
      const bloom = this.bloom, set = bloom.setSize.bind(bloom), k = o.bloomScale;
      bloom.setSize = (w: number, h: number) => set(Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)));
    }
    this.buildPost();

    this.stats = document.createElement('div');
    this.stats.className = 'piece-stats';
    this.stats.setAttribute('aria-hidden', 'true');
    host.appendChild(this.stats);
  }

  private buildPost(): void {
    const c = this.composer;
    while (c.passes.length > 1) c.removePass(c.passes[c.passes.length - 1]);
    this.ao?.dispose();
    this.smaa?.dispose();
    this.ao = null;
    this.smaa = null;
    const t = TIER_POST[this.tier];
    if (t.ao) {
      this.ao = new GTAOPass(this.scene, this.camera, 256, 256);
      const samples = this.tier === 'high' ? this.o.aoSamples ?? 16 : 8;
      this.ao.updateGtaoMaterial({ radius: this.o.ao ?? 0.035, distanceExponent: 1.6, thickness: 0.6, scale: 1.25, samples });
      this.ao.blendIntensity = this.o.aoIntensity ?? 1;
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples });
      // Occlusion is soft; it is worked out at a fraction of the screen's pixels and blended up.
      const aoPass = this.ao, aoSet = aoPass.setSize.bind(aoPass), sc = this.tier === 'high' ? this.o.aoScale ?? t.aoScale : t.aoScale;
      aoPass.setSize = (w: number, h: number) => aoSet(Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
      const pd = (this.ao as unknown as { pdMaterial: THREE.ShaderMaterial }).pdMaterial;
      pd.uniforms.tNoise.value = seededNoise();
      // Light (glows, light-water, additive veils) casts no occlusion: keep it out of the normal and depth pass.
      const ao = this.ao as unknown as { _overrideVisibility(): void; _visibilityCache: THREE.Object3D[] };
      const base = ao._overrideVisibility.bind(ao);
      ao._overrideVisibility = () => {
        base();
        this.scene.traverse((o) => {
          if (o instanceof THREE.Sprite && o.visible) { o.visible = false; ao._visibilityCache.push(o); return; }
          if (!(o instanceof THREE.Mesh) || !o.visible) return;
          const m = o.material as THREE.Material;
          if (o.userData.noAO || m.blending === THREE.AdditiveBlending || m instanceof THREE.MeshBasicMaterial || m instanceof THREE.ShaderMaterial) { o.visible = false; ao._visibilityCache.push(o); }
        });
      };
      c.addPass(this.ao);
    }
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    if (t.smaa) { this.smaa = new SMAAPass(); c.addPass(this.smaa); }
    c.addPass(ditherPass());
    this.lamp.shadow.mapSize.set(t.shadow, t.shadow);
    this.lamp.shadow.map?.dispose();
    this.lamp.shadow.map = null as unknown as THREE.WebGLRenderTarget;
  }

  // Compiles every material in the variant the first frame will use. The post chain draws the scene into its own
  // target, where three picks programs without tone mapping; compiled for the screen, the real programs would still
  // link on the first frame and stall it.
  // Parts hidden until a moment of the piece's life (smoke, a flame, a sling) are shown for the compile, so they do not
  // stall the frame they first appear in.
  // With pace, every program the first frame needs is compiled ahead of it and none is waited for: the scene's thing by
  // thing, then the post chain's, the shadows' and the occlusion pass's, which three would otherwise compile in the
  // frame itself and wait on as each links. pace is called between the pieces of that work.
  async warm(pace?: () => Promise<void> | void): Promise<void> {
    // Lights keep their state: three compiles for the number of lights in view, and that must match the first frame.
    const seen = (o: THREE.Object3D) => { for (let x: THREE.Object3D | null = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const dark = new Set<THREE.Object3D>();
    this.scene.traverse((o) => { if (o instanceof THREE.Light && o.visible && !seen(o)) dark.add(o); });
    const hidden: THREE.Object3D[] = [];
    this.scene.traverse((o) => { if (!o.visible && !(o instanceof THREE.Light)) { hidden.push(o); o.visible = true; } });
    for (const l of dark) l.visible = false;
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.composer.readBuffer);
    let spare: THREE.Material[] = [];
    if (pace) spare = await this.compileAhead(pace);
    else {
      const linked = this.renderer.compileAsync(this.scene, this.camera);
      // three waits for the programs to link by asking every 10 ms, and asks nothing else of the GPU meanwhile. With
      // no flush the browser does not begin the last link until it is next idle, about a second later.
      this.renderer.getContext().flush();
      await linked;
    }
    this.renderer.setRenderTarget(prev);
    const shadows = pace ? await this.drawAhead(pace) : null;
    // The GPU driver builds a program's pipeline at its first draw, so one frame is drawn with everything shown. The
    // piece draws its real first frame straight after; this one is never seen. Paced, it is drawn a pass to a task.
    if (pace) await this.renderInSteps(pace);
    else this.composer.render();
    shadows?.();
    for (const m of spare) m.dispose();
    for (const o of hidden) o.visible = false;
    for (const l of dark) l.visible = true;
    await pause();
  }

  // The composer's render(), with pace called after each pass.
  private async renderInSteps(pace: () => Promise<void> | void): Promise<void> {
    const c = this.composer, prev = this.renderer.getRenderTarget();
    for (const [i, pass] of c.passes.entries()) {
      if (!pass.enabled) continue;
      pass.renderToScreen = c.renderToScreen && c.isLastEnabledPass(i);
      pass.render(this.renderer, c.writeBuffer, c.readBuffer, 0, false);
      if (pass.needsSwap) c.swapBuffers();
      await pace();
    }
    this.renderer.setRenderTarget(prev);
  }

  // Draws the scene a few things at a time into a target of one pixel, so their buffers and textures are sent in tasks
  // of their own and not all in the frame drawn with everything shown, and then the shadow maps, one light to a task.
  // Hands back what puts the shadows as they were, to be called after that frame, which then has no shadow to draw.
  private async drawAhead(pace: () => Promise<void> | void): Promise<() => void> {
    const r = this.renderer, scene = this.scene, prev = r.getRenderTarget(), read = this.composer.readBuffer;
    const tiny = new THREE.WebGLRenderTarget(1, 1, { type: read.texture.type, format: read.texture.format as THREE.PixelFormat, colorSpace: read.texture.colorSpace as THREE.ColorSpace, depthBuffer: read.depthBuffer, stencilBuffer: read.stencilBuffer, samples: read.samples });
    const casters: { shadow: THREE.LightShadow }[] = [];
    scene.traverse((o) => { const shadow = (o as THREE.Object3D & { shadow?: THREE.LightShadow }).shadow; if (o instanceof THREE.Light && o.castShadow && shadow) casters.push({ shadow }); });
    const was = casters.map(({ shadow }) => [shadow.autoUpdate, shadow.needsUpdate] as const);
    for (const { shadow } of casters) { shadow.autoUpdate = false; shadow.needsUpdate = false; }
    const things: THREE.Object3D[] = [];
    scene.traverse((o) => { if (o.visible && ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine || (o as THREE.Sprite).isSprite)) things.push(o); });
    const size = (o: THREE.Object3D) => (o as THREE.Mesh).geometry?.getAttribute('position')?.count ?? 0;
    for (let from = 0; from < things.length;) {
      let to = from, n = 0;
      while (to < things.length && (to === from || n < DRAW_AHEAD)) n += size(things[to++]);
      const batch = new Set(things.slice(from, to));
      for (const o of things) o.visible = batch.has(o);
      r.setRenderTarget(tiny);
      r.render(scene, this.camera);
      from = to;
      await pace();
    }
    for (const o of things) o.visible = true;
    for (const { shadow } of casters) {
      shadow.needsUpdate = true;
      r.setRenderTarget(tiny);
      r.render(scene, this.camera);
      await pace();
    }
    r.setRenderTarget(prev);
    tiny.dispose();
    return () => casters.forEach(({ shadow }, i) => { [shadow.autoUpdate, shadow.needsUpdate] = was[i]; });
  }

  private async compileAhead(pace: () => Promise<void> | void): Promise<THREE.Material[]> {
    const r = this.renderer, scene = this.scene;
    type Drawn = THREE.Object3D & { material: THREE.Material | THREE.Material[]; isInstancedMesh?: boolean };
    const drawn = (o: THREE.Object3D): o is Drawn => (o as THREE.Mesh).isMesh === true || (o as THREE.Points).isPoints === true || (o as THREE.Line).isLine === true || (o as THREE.Sprite).isSprite === true;
    const list = (m: THREE.Material | THREE.Material[]) => (Array.isArray(m) ? m : [m]);
    // One thing at a time, in place of its subtree: a stand in that is the thing in every way but has no children.
    const alone = (o: Drawn, material?: THREE.Material | THREE.Material[]) => {
      const p = Object.create(o) as Drawn;
      p.children = [];
      if (material) p.material = material;
      return p;
    };
    const things: Drawn[] = [];
    scene.traverse((o) => { if (drawn(o)) things.push(o); });
    for (const o of things) { r.compile(alone(o), this.camera, scene); await pace(); }

    // What the post chain draws, gathered by running it once with nothing drawn.
    // A pass draws one quad with a material it changes from draw to draw, so the material is kept with the draw.
    const calls: { scene: THREE.Object3D; material?: THREE.Material | THREE.Material[]; camera: THREE.Camera; target: THREE.WebGLRenderTarget | null; override: THREE.Material | null; shown: Drawn[] }[] = [];
    const real = r.render, read = this.composer.readBuffer;
    r.render = (s: THREE.Object3D, c: THREE.Camera) => {
      const override = (s as THREE.Scene).isScene ? (s as THREE.Scene).overrideMaterial : null, shown: Drawn[] = [];
      if (override) s.traverseVisible((o) => { if (drawn(o)) shown.push(o); });
      calls.push({ scene: s, material: drawn(s) ? s.material : undefined, camera: c, target: r.getRenderTarget(), override, shown });
    };
    try { this.composer.render(); } finally { r.render = real; }
    if (this.composer.readBuffer !== read) this.composer.swapBuffers();
    for (const call of calls) {
      if (call.scene === scene && !call.override) continue;
      r.setRenderTarget(call.target);
      if (call.override) {
        const override = call.override;
        for (const o of call.shown) { r.compile(alone(o, list(o.material).map((m) => (m.allowOverride ? override : m))), call.camera, scene); await pace(); }
      } else if (call.material && drawn(call.scene)) {
        r.compile(alone(call.scene, call.material), call.camera);
        await pace();
      }
    }
    r.setRenderTarget(this.composer.readBuffer);

    // The shadows: each thing that casts one, drawn by a depth material set up as the shadow map sets up its own.
    const spare = new Map<string, THREE.Material>();
    type Maps = THREE.Material & { wireframe?: boolean; map?: THREE.Texture | null; alphaMap?: THREE.Texture | null; displacementMap?: THREE.Texture | null; displacementScale?: number; displacementBias?: number };
    const kinds = new Set<boolean>();
    scene.traverseVisible((o) => { if (o instanceof THREE.Light && o.castShadow) kinds.add(o instanceof THREE.PointLight); });
    const flip: Record<number, THREE.Side> = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
    const casters: Drawn[] = [];
    scene.traverseVisible((o) => { if (drawn(o) && o.castShadow) casters.push(o); });
    for (const point of kinds) for (const o of casters) {
      const own = point ? o.customDistanceMaterial : o.customDepthMaterial;
      const mats = list(o.material).filter((m) => m.visible).map((m: Maps) => {
        if (own) return own;
        const side = m.shadowSide ?? flip[m.side], alphaTest = m.alphaToCoverage ? 0.5 : m.alphaTest;
        const key = [point, side, m.wireframe, m.alphaMap?.uuid, m.map?.uuid, alphaTest, m.displacementMap?.uuid, m.displacementScale, m.displacementBias].join('|');
        let d = spare.get(key) as Maps | undefined;
        if (!d) {
          d = point ? new THREE.MeshDistanceMaterial() : new THREE.MeshDepthMaterial();
          d.side = side;
          d.wireframe = m.wireframe;
          d.alphaMap = m.alphaMap;
          d.alphaTest = alphaTest;
          d.map = m.map;
          d.displacementMap = m.displacementMap;
          d.displacementScale = m.displacementScale;
          d.displacementBias = m.displacementBias;
          spare.set(key, d);
        }
        return d;
      });
      if (!mats.length) continue;
      r.compile(alone(o, Array.isArray(o.material) ? mats : mats[0]), this.camera, scene);
      await pace();
    }

    // Each program is waited for while it links on its own thread, then read once, so that reading it in the frame
    // waits on nothing.
    const programs = (r.info.programs ?? []) as (THREE.WebGLProgram & { isReady?(): boolean })[];
    for (let left = programs.filter((p) => p.isReady && !p.isReady()), n = 0; left.length && n < 500; left = left.filter((p) => !p.isReady!()), n++) await new Promise((done) => setTimeout(done, 10));
    for (const p of programs) { p.getUniforms(); await pace(); }
    return [...spare.values()];
  }

  setResolutionScale(k: number): void {
    if (k === this.resScale) return;
    this.resScale = k;
    this.resize();
  }

  setTier(tier: Tier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.buildPost();
    this.resize();
  }

  resize(): void {
    const r = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const dpr = pixelRatioFor(this.tier, devicePixelRatio || 1, w * h) * this.resScale;
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // The making view: the same scene as clean wireframe over the lit surface, plus a readout.
  // The clay view for form shots: one clay material on everything through the render pass; light (glows, light-water,
  // sprites, points) hidden; no bloom.
  clay = false;
  private clayMat = new THREE.MeshStandardMaterial({ color: 0xbdb3a6, roughness: 0.85 });
  setClay(on: boolean, root: THREE.Object3D): void {
    this.clay = on;
    this.renderPass.overrideMaterial = on ? this.clayMat : null;
    this.bloom.enabled = !on;
    root.traverse((o) => {
      if (o instanceof THREE.Sprite || o instanceof THREE.Points) { o.userData.clayHidden = on; return; }
      if (!(o instanceof THREE.Mesh)) return;
      const m = o.material as THREE.Material;
      if (m.blending === THREE.AdditiveBlending || m instanceof THREE.MeshBasicMaterial || m instanceof THREE.ShaderMaterial || /screen/i.test(m.name)) o.userData.clayHidden = on;
    });
  }

  // Hides what clay hides; call after anything that sets visibility for the frame.
  hideForClay(root: THREE.Object3D): void {
    if (this.clay) root.traverse((o) => { if (o.userData.clayHidden) o.visible = false; });
  }

  setMaking(on: boolean, root: THREE.Object3D): void {
    if (on === this.making) return;
    this.making = on;
    if (on) {
      // Wire over the built geometry only (instanced crowds and foliage would turn to fuzz), the lit surface
      // dimmed underneath so the lines read and the materials still show through.
      const mat = new THREE.MeshBasicMaterial({ color: 0xe8bd8a, wireframe: true, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false });
      const list: THREE.Mesh[] = [];
      // Skip parts so dense their wire would only shimmer (knurling, lathed lenses): the readout still counts them.
      const dense = (o: THREE.Mesh) => { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const r = g.boundingSphere?.radius ?? 1; const tris = (g.index ? g.index.count : g.getAttribute('position').count) / 3; return tris / (4 * Math.PI * r * r) > this.wireDensity; };
      root.traverse((o) => { if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && !o.userData.noWire && o.visible && !dense(o)) list.push(o); });
      this.exposureBefore = this.renderer.toneMappingExposure;
      this.renderer.toneMappingExposure = this.exposureBefore * 0.3;
      const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0xe8bd8a).multiplyScalar(2.6), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
      // Edges lie on the surface they outline; draw them a hair nearer so the surface never hides them.
      lineMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\ngl_Position.z -= 0.0004 * gl_Position.w;'); };
      // A part may bring its own line geometry (wireGeo: a lathe's rings and meridians at a readable spacing) and a
      // strength (wireK) so a dense lattice does not bloom into a glow.
      const dimmed = new Map<number, THREE.LineBasicMaterial>();
      const lineFor = (k: number) => {
        if (k === 1) return lineMat;
        let m = dimmed.get(k);
        if (!m) { m = lineMat.clone(); m.color.multiplyScalar(k); m.onBeforeCompile = lineMat.onBeforeCompile; dimmed.set(k, m); }
        return m;
      };
      for (const o of list) {
        const own = o.userData.wireGeo as THREE.BufferGeometry | undefined;
        const k = (o.userData.wireK as number | undefined) ?? 1;
        const w = own ? new THREE.LineSegments(own.clone(), lineFor(k)) : this.wireEdges > 0 ? new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, this.wireEdges), lineFor(k)) : new THREE.Mesh(o.geometry, mat);
        w.matrixAutoUpdate = false;
        w.matrix.copy(o.matrix);
        w.renderOrder = 10;
        w.userData.noWire = true;
        o.parent?.add(w);
        this.wire.push(w);
      }
    } else {
      for (const w of this.wire) { w.parent?.remove(w); if (w instanceof THREE.LineSegments) w.geometry.dispose(); }
      this.wire = [];
      this.renderer.toneMappingExposure = this.exposureBefore;
    }
    this.host.dataset.making = on ? 'on' : 'off';
  }

  render(): void {
    const t0 = performance.now();
    this.renderer.info.reset();
    this.renderer.info.autoReset = false;
    this.composer.render();
    this.frameMs = performance.now() - t0;
    if (this.making) {
      const i = this.renderer.info.render;
      const w = site.ui.stats;
      // Under the frozen test clock the frame time is shown to the whole millisecond, so a still is the same image every time.
      const ms = clock.isFrozen() ? String(Math.max(1, Math.round(this.frameMs))) : this.frameMs.toFixed(1);
      this.stats.textContent = `${Math.round(i.triangles).toLocaleString('en-US')} ${w.triangles} · ${i.calls} ${w.calls} · ${ms} ${w.frame}`;
    }
  }

  dispose(): void {
    this.composer.dispose();
    this.ao?.dispose();
    this.envRT.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) { for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose(); m.dispose(); }
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.stats.remove();
  }
}
