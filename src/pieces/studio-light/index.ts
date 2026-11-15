import * as THREE from 'three';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import type { PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import { trueDarks } from '../../world/tone';
import type { Anchor, StruckPiece } from '../../world/struck';
import { SL, buildStudioLight, type StudioModel } from './model';

// The studio light in About: a Fresnel on a yoke, hung from the wall over his portrait. The stream strikes its flank,
// the lamp inside catches, and its lens throws the stream on down and to the left. The page draws the beam.

// Where the stream meets it and where it leaves, across and down from the host's middle in host heights, measured by
// projecting the model's own points through the camera at rest (measure() below gives them again).
export const STUDIO: { strike: Anchor; lens: Anchor } = { strike: [-0.0258, -0.0749], lens: [0.0193, 0.0876] };

const D2R = Math.PI / 180;
const FOV = 15;
// The head, from its rear cap to the barn doors' tips along its aim, against the host's height.
const HEAD_SHARE = 0.45;
// Where the stream strikes the drum: along it, and how far round from the upper left edge toward the visitor.
const STRIKE = { z: 18, round: 24 };
// The cursor's light: the plane it moves in, in front of the wall, how far it may stand from the light, its power.
const LAMP = { z: 0.8, reach: 0.95, spread: 1.7, power: 1.6 };
// The stream's own light at a strike, and the lamp's light thrown on the barn doors, as point lights.
const FLASH_LIGHT = 0.012;
// A room light from above and behind, toward the wall, that catches the top edges and parts the dark metal from the
// page's ground. Facing away from it, the wall takes none of it.
const RIM = { at: [0.35, 1.0, -0.9] as const, power: 2.4 };
const LENS_LIGHT = 0.0045;
// The light's timeline from the strike, in seconds: the flank's flash, the lamp house catching, the lens coming up
// from its middle.
const T = { flash: 0.085, catch: 0.025, catchRise: 0.05, catchOver: 0.12, lens: 0.075, lensRise: 0.075, lensOver: 0.16, spread: 0.33 };
const OVER = { catch: 0.24, lens: 0.16 };
// Once lit the lamp only breathes, too slowly to need every frame: it is drawn this many times a second.
const BREATH_RATE = 30;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, x: number) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
// A rise with weight: quick at first, a little past full, then settling back.
const heave = (x: number, rise: number, over: number, k: number) => x <= 0 ? 0 : 1 - Math.exp(-x / rise) + k * (x / over) * Math.exp(1 - x / over);

interface Lit { flash: number; inside: number; lens: number; front: number; heat: number }

export function lightAt(on: number, since: number, t: number, breathe: boolean): Lit {
  const flash = since >= 0 && since < 1 ? Math.exp(-since / T.flash) : 0;
  const struck = since >= 0 && since < 30;
  const c = struck ? heave(since - T.catch, T.catchRise, T.catchOver, OVER.catch) : 1;
  const l = struck ? heave(since - T.lens, T.lensRise, T.lensOver, OVER.lens) : 1;
  const sp = struck ? 1 - (1 - clamp01((since - T.lens) / T.spread)) ** 3 : 1;
  const b = breathe ? 1 + 0.028 * Math.sin(t * 1.93) + 0.017 * Math.sin(t * 3.17 + 1.7) + 0.009 * Math.sin(t * 5.41 + 0.4) : 1;
  const w = on ** 1.25;
  return {
    flash,
    inside: c * w * b,
    lens: l * w * b,
    front: Math.min(1.22 * sp, 0.3 + 0.92 * smooth(0, 0.75, on)),
    heat: (0.6 + 0.4 * smooth(0.05, 0.9, on)) * (0.97 + 0.03 * b),
  };
}

export function createStudioLight(): StruckPiece {
  let stage: Stage | null = null;
  let model: StudioModel | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let off: (() => void) | null = null;
  let ro: ResizeObserver | null = null;
  let io: IntersectionObserver | null = null;
  let visible = true;
  let hold: number | null = null;
  let still = false;
  let lampUV = { x: 0.8, y: 0.2 };
  let stream = { on: 0, since: 60 };
  let forced: { on: number; since: number } | null = null;
  let viewForced: { az: number; el: number; d: number } | null = null;
  let last = '';
  let draws = 0;
  let lensLight: THREE.PointLight | null = null;
  let flashLight: THREE.PointLight | null = null;
  const rest = { x: 0, y: 0, z: 2, centre: new THREE.Vector3(), H: 0.6 };
  const strikeHead = new THREE.Vector3();
  const strikeNormal = new THREE.Vector3();
  const flame = new THREE.Color(hex('flame')), hot = new THREE.Color(hex('hot'));

  const time = () => hold ?? clock.now();
  const frozen = () => clock.isFrozen() || hold !== null;

  // Projects a point of the root (millimetres) to the host: across and down from its middle, in host heights.
  const cam = new THREE.PerspectiveCamera(FOV, 1, 0.05, 30);
  const anchorOf = (p: THREE.Vector3, c: THREE.PerspectiveCamera = cam): Anchor => {
    const v = p.clone().multiplyScalar(SL.SCALE).project(c);
    return [(v.x * c.aspect) / 2, -v.y / 2];
  };
  const headPoint = (p: THREE.Vector3) => model!.root.worldToLocal(model!.inner.localToWorld(p.clone()));

  const placeRest = (c: THREE.PerspectiveCamera) => {
    c.position.set(rest.x, rest.y, rest.z);
    c.lookAt(rest.x, rest.y, 0);
    c.updateMatrixWorld(true);
  };

  // How far what is drawn reaches in the host, from the parts' own points and the mount's box.
  const extentOf = (c: THREE.PerspectiveCamera) => {
    const m = model!;
    let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
    const take = (v: THREE.Vector3) => { const a = anchorOf(v, c); top = Math.min(top, a[1]); bottom = Math.max(bottom, a[1]); left = Math.min(left, a[0]); right = Math.max(right, a[0]); };
    const v = new THREE.Vector3();
    m.root.updateMatrixWorld(true);
    m.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.name === 'slWall') return;
      const p = o.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i += 5) take(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).divideScalar(SL.SCALE));
    });
    const b = m.mountBox;
    for (let k = 0; k < 8; k++) take(v.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z));
    return { top, bottom, left, right };
  };

  // Turns the head and places the camera: the aim is 52 degrees under level on the screen, measured from the rear cap
  // through the lens's middle, and the head from rear cap to the doors' tips is HEAD_SHARE of the host's height.
  const solve = () => {
    const m = model!;
    const dirOf = (phi: number) => new THREE.Vector3(-Math.cos(SL.TOWARD * D2R) * Math.cos(phi), -Math.cos(SL.TOWARD * D2R) * Math.sin(phi), Math.sin(SL.TOWARD * D2R));
    let phi = SL.AIM * D2R;
    const u = new THREE.Vector2(-Math.cos(SL.AIM * D2R), Math.sin(SL.AIM * D2R));
    const length = () => {
      const a = anchorOf(headPoint(m.rear));
      let best = 0;
      for (const tp of m.tips) { const b = anchorOf(headPoint(tp)); best = Math.max(best, (b[0] - a[0]) * u.x + (b[1] - a[1]) * u.y); }
      return best;
    };
    const angle = () => { const a = anchorOf(headPoint(m.rear)), b = anchorOf(headPoint(m.lensMiddle)); return Math.atan2(b[1] - a[1], a[0] - b[0]); };
    cam.aspect = 1;
    cam.updateProjectionMatrix();
    for (let it = 0; it < 4; it++) {
      m.aim(dirOf(phi));
      const box = new THREE.Box3();
      m.root.traverse((o) => { if (o instanceof THREE.Mesh && o.name !== 'slWall' && o.name !== 'slGlow') box.expandByObject(o); });
      box.applyMatrix4(new THREE.Matrix4().makeScale(1 / SL.SCALE, 1 / SL.SCALE, 1 / SL.SCALE)).union(m.mountBox);
      box.getCenter(rest.centre);
      rest.x = rest.centre.x * SL.SCALE; rest.y = rest.centre.y * SL.SCALE;
      let lo = 0.5, hi = 8;
      for (let i = 0; i < 40; i++) { rest.z = (lo + hi) / 2; placeRest(cam); if (length() > HEAD_SHARE) lo = rest.z; else hi = rest.z; }
      // Centred on what is drawn, not on its box: the near parts loom larger.
      const e = extentOf(cam);
      const Hm = 2 * (rest.z - rest.centre.z * SL.SCALE) * Math.tan((FOV / 2) * D2R);
      rest.x += ((e.left + e.right) / 2) * Hm;
      rest.y -= ((e.top + e.bottom) / 2) * Hm;
      placeRest(cam);
      let a0 = 35 * D2R, a1 = 70 * D2R;
      for (let i = 0; i < 40; i++) { phi = (a0 + a1) / 2; m.aim(dirOf(phi)); if (angle() < SL.AIM * D2R) a0 = phi; else a1 = phi; }
    }
    rest.H = 2 * (rest.z - rest.centre.z * SL.SCALE) * Math.tan((FOV / 2) * D2R) / SL.SCALE;
    // The strike: on the drum's upper left edge as the visitor sees it, turned a little toward him.
    const view = new THREE.Vector3(0, 0, 1).applyQuaternion(m.inner.getWorldQuaternion(new THREE.Quaternion()).invert());
    const zAx = new THREE.Vector3(0, 0, 1);
    const sil = new THREE.Vector3().crossVectors(zAx, view).normalize();
    const sA = Math.atan2(sil.y, sil.x), vA = Math.atan2(view.y, view.x);
    let side = sA;
    // Of the two edges, the one over the top.
    if (Math.sin(sA) < 0) side = sA + Math.PI;
    const towardView = Math.sign(Math.sin(vA - side)) || 1;
    const a = side + towardView * STRIKE.round * D2R;
    strikeNormal.set(Math.cos(a), Math.sin(a), 0);
    strikeHead.copy(strikeNormal).multiplyScalar(SL.R).setZ(STRIKE.z);
  };

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const placeLamp = () => {
    if (!stage) return;
    const c = new THREE.PerspectiveCamera(FOV, stage.width / Math.max(1, stage.height), 0.05, 30);
    placeRest(c);
    c.updateProjectionMatrix();
    ndc.set(lampUV.x * 2 - 1, 1 - lampUV.y * 2);
    ray.setFromCamera(ndc, c);
    const o = ray.ray.origin, d = ray.ray.direction;
    const p = o.clone().addScaledVector(d, (LAMP.z - o.z) / d.z);
    const centre = new THREE.Vector3(rest.x, rest.y, LAMP.z);
    const off = p.sub(centre).multiplyScalar(LAMP.spread);
    const r = off.length();
    if (r > LAMP.reach) off.multiplyScalar(LAMP.reach / r);
    stage.lamp.position.copy(centre).add(off);
    stage.lamp.intensity = LAMP.power;
  };

  const apply = () => {
    if (!stage || !model) return;
    const m = model;
    const t = time();
    const s = forced ?? stream;
    const L = lightAt(s.on, s.since, t, !still);
    if (viewForced) {
      const v = viewForced, c = rest.centre.clone().multiplyScalar(SL.SCALE);
      const az = v.az * D2R, el = v.el * D2R;
      stage.camera.position.set(c.x + v.d * Math.cos(el) * Math.sin(az), c.y + v.d * Math.sin(el), c.z + v.d * Math.cos(el) * Math.cos(az));
      stage.camera.lookAt(c);
    } else placeRest(stage.camera);
    placeLamp();
    const lu = m.lens.uniforms;
    lu.uLamp.value.copy(stage.lamp.position);
    lu.uLampK.value = 1;
    lu.uLit.value = L.lens;
    lu.uFront.value = L.front;
    lu.uHeat.value = L.heat;
    const k = L.inside;
    m.glow.uniforms.uK.value = k;
    (m.leafIn.userData.uniforms as { uLeafLit: { value: number } }).uLeafLit.value = L.lens;
    const hu = m.housing.userData.uniforms as { uStrike: { value: THREE.Vector3 }; uFlash: { value: number }; uFlashCol: { value: THREE.Color } };
    hu.uStrike.value.copy(strikeHead);
    hu.uFlash.value = L.flash;
    hu.uFlashCol.value.copy(flame).lerp(hot, L.flash);
    if (lensLight) { lensLight.intensity = LENS_LIGHT * L.lens; lensLight.color.copy(flame).lerp(hot, clamp01(L.heat - 0.6)); }
    if (flashLight) flashLight.intensity = FLASH_LIGHT * L.flash;
  };

  const signature = () => {
    const s = forced ?? stream;
    const moving = !still && (s.on > 0.001 || (s.since >= 0 && s.since < 1.2));
    return [lampUV.x.toFixed(4), lampUV.y.toFixed(4), s.on.toFixed(4), s.since < 1.2 ? s.since.toFixed(4) : 'x', moving ? Math.floor(time() * BREATH_RATE) : '-', viewForced ? JSON.stringify(viewForced) : '', stage?.width, stage?.height, stage?.tier].join('|');
  };

  const frame = (force = false) => {
    if (!stage || !visible) return;
    const sig = signature();
    if (!force && sig === last) return;
    last = sig;
    apply();
    stage.render();
    draws++;
  };

  const measure = () => {
    if (!model || !stage) return null;
    const m = model;
    const c = new THREE.PerspectiveCamera(FOV, stage.width / Math.max(1, stage.height), 0.05, 30);
    placeRest(c);
    c.updateProjectionMatrix();
    const rear = anchorOf(headPoint(m.rear), c), lens = anchorOf(headPoint(m.lensMiddle), c), strike = anchorOf(headPoint(strikeHead), c);
    const u = [-Math.cos(SL.AIM * D2R), Math.sin(SL.AIM * D2R)];
    let len = 0;
    for (const tp of m.tips) { const b = anchorOf(headPoint(tp), c); len = Math.max(len, (b[0] - rear[0]) * u[0] + (b[1] - rear[1]) * u[1]); }
    const box = new THREE.Box3();
    m.root.traverse((o) => { if (o instanceof THREE.Mesh && o.name !== 'slWall' && o.name !== 'slGlow') box.expandByObject(o); });
    const extent = extentOf(c);
    let tris = 0;
    m.root.traverse((o) => { if (o instanceof THREE.Mesh) { const g = o.geometry; tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3; } });
    // What lies under the stream's line as it comes in from the left falling 4 degrees, and under the throw from the
    // lens: the first part each sample point of the line meets, if any.
    const under = (from: Anchor, dx: number, dy: number, upto: number) => {
      const hits: string[] = [];
      const rc = new THREE.Raycaster();
      for (let k = 1; k <= 40; k++) {
        const s = (k / 40) * upto;
        const ax = from[0] + dx * s, ay = from[1] + dy * s;
        rc.setFromCamera(new THREE.Vector2((ax * 2) / c.aspect, -ay * 2), c);
        const hit = rc.intersectObject(m.root, true).find((h) => h.object.name !== 'slWall' && h.object.name !== 'slGlow');
        hits.push(hit ? `${s.toFixed(3)}:${hit.object.name}` : '');
      }
      return hits.filter(Boolean);
    };
    const inLine = under(strike, -Math.cos(4 * D2R), -Math.sin(4 * D2R), 0.4);
    const throwLine = under(lens, -Math.cos(SL.AIM * D2R), Math.sin(SL.AIM * D2R), 0.4);
    // The furthest right each part reaches, and the point of it, for keeping clear of the page's edge.
    const rightBy: Record<string, string> = {};
    {
      const v = new THREE.Vector3();
      m.root.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || o.name === 'slWall') return;
        const p = o.geometry.getAttribute('position');
        let best = -Infinity, at = '';
        for (let i = 0; i < p.count; i += 3) {
          v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).divideScalar(SL.SCALE);
          const a = anchorOf(v, c);
          if (a[0] > best) { best = a[0]; at = `${v.x.toFixed(0)},${v.y.toFixed(0)},${v.z.toFixed(0)}`; }
        }
        if (best > 0.2) rightBy[o.name] = `${best.toFixed(3)} @ ${at}`;
      });
    }
    let meshes = 0;
    m.root.traverse((o) => { if (o instanceof THREE.Mesh && o.visible) meshes++; });
    const info = stage.renderer.info.render;
    return {
      strike, lens, rear,
      aim: (Math.atan2(lens[1] - rear[1], rear[0] - lens[0]) / D2R),
      headLength: len,
      extent,
      tris: Math.round(tris), rightBy, meshes, inLine, throwLine, calls: info.calls, drawnTris: info.triangles, frameMs: stage.frameMs,
    };
  };

  const piece: StruckPiece = {
    async mount(h: HTMLElement, opts: PieceOptions) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      // The rim fades to nothing, so neither a glow nor a shadow can end at the canvas's edge.
      const fade = 'linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent), linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)';
      canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;mask-image:${fade};-webkit-mask-image:${fade};mask-composite:intersect;-webkit-mask-composite:source-in`;
      h.appendChild(canvas);
      still = opts.tier === 'static' || matchMedia('(prefers-reduced-motion: reduce)').matches;
      await document.fonts.load('600 20px "JetBrains Mono Variable"').catch(() => null);
      stage = new Stage(h, canvas, { tier: opts.tier, fov: FOV, near: 0.2, far: 6, env: 'studio', envIntensity: 0.95, bloom: { strength: 0.34, threshold: 1.6, radius: 0.18 }, ao: 0.012, aoIntensity: 0.65, lampAngle: 0.75 });
      trueDarks(stage.renderer);
      model = await buildStudioLight();
      stage.wireDensity = 0.5;
      stage.wireEdges = 14;
      const s = stage.scene;
      s.add(model.root);
      solve();
      model.buildMount();
      const wu = model.wall.userData.uniforms as { uFadeC: { value: THREE.Vector2 }; uFadeR: { value: THREE.Vector2 } };
      wu.uFadeC.value.set(rest.centre.x, rest.centre.y);
      wu.uFadeR.value.set(rest.H * 0.21, rest.H * 0.44);
      stage.lamp.target.position.copy(rest.centre).multiplyScalar(SL.SCALE);
      stage.lamp.shadow.radius = 9;
      // Metal this small at a grazing light shows acne at the stage's bias.
      stage.lamp.shadow.normalBias = 0.0055;
      lensLight = new THREE.PointLight(flame, 0, 0, 2);
      lensLight.position.set(0, 0, 120);
      model.inner.add(lensLight);
      const rim = new THREE.DirectionalLight(new THREE.Color(hex('copper-light')), RIM.power);
      rim.position.copy(rest.centre).multiplyScalar(SL.SCALE).add(new THREE.Vector3(...RIM.at));
      rim.target.position.copy(rest.centre).multiplyScalar(SL.SCALE);
      s.add(rim, rim.target);
      flashLight = new THREE.PointLight(hot, 0, 0, 2);
      flashLight.position.copy(strikeHead).addScaledVector(strikeNormal, 16);
      model.inner.add(flashLight);
      stage.resize();
      apply();
      await stage.warm();
      frame(true);
      ro = new ResizeObserver(() => { stage?.resize(); frame(true); });
      ro.observe(h);
      io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) frame(true); });
      io.observe(h);
      off = clock.onFrame(() => frame());
      opts.onReady?.();
    },
    setLamp(x, y) { lampUV = { x, y }; },
    setStream(on, since) { stream = { on: clamp01(on), since }; },
    setProgress() {},
    setWaterLight() {},
    setMaking(on) { if (stage && model) stage.setMaking(on, model.root); frame(true); },
    setTier(tier: Tier) { stage?.setTier(tier); still = tier === 'static' || matchMedia('(prefers-reduced-motion: reduce)').matches; frame(true); },
    freeze(t) { hold = t; frame(true); },
    view(az, el, dist) { viewForced = { az, el, d: dist }; frame(true); },
    dispose() {
      off?.(); ro?.disconnect(); io?.disconnect();
      stage?.dispose(); canvas?.remove();
      stage = null; model = null; canvas = null;
    },
  };
  Object.assign(piece, {
    // Holds the stream at a level and a time since its strike, over what the page hands it, for stills and strips.
    // hold(null) lets go.
    hold(on: number | null, since = 60) { forced = on === null ? null : { on: clamp01(on), since }; frame(true); },
    // The strike as the lab plays it: the stream comes fully on over 0.3 seconds from the strike.
    strikeAt(age: number) { forced = { on: clamp01(age / 0.3), since: age }; frame(true); },
    measure,
    draws: () => draws,
    rest: () => ({ ...rest, centre: rest.centre.toArray() }),
    clay(on: boolean) { if (stage && model) stage.setClay(on, model.root); frame(true); },
    frozen,
  });
  return piece;
}

export default createStudioLight;
