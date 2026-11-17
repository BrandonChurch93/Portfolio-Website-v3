import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import { SIDE, myTurn } from '../../world/turn';
import type { PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import { balance, trueDarks } from '../../world/tone';
import { WAYS, type Anchor, type StruckPiece, type Way } from '../../world/struck';
import { shardMeshes, shardUniforms, SHARD_KINDS } from '../cpu/shard';
import { BODY, CASE, CROWN, DEG, DIAL, DIAL_FACE, MOV, PENDANT, STRIKE, VIEW, YAW } from './layout';
import { LIFE, LIGHTS, Life, type LifeAt } from './life';
import { buildWatch, type WatchModel } from './model';
import { Runner } from './run';
import { PARTS_MAX, PART_TEXELS } from './shading';

// The pocket watch, lying open: the dial in its body at the right, the movement in the case back at the left, at the
// left of the second row of skills, Full-Stack Engineering. It is not on the page until the stream strikes it, and
// comes on in one of three ways (./life.ts), as the CPU does. With the stream on it, it runs (./run.ts).

export { LIFE };

const MM = 0.001;
// A point of the watch, in millimetres, where it stands in the world at rest.
const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x * Math.cos(YAW) + z * Math.sin(YAW), y, -x * Math.sin(YAW) + z * Math.cos(YAW)).multiplyScalar(MM);
const STRIKE_W = toWorld(STRIKE.x, STRIKE.y, STRIKE.z);
const EYE_DIR = new THREE.Vector3(-Math.sin(VIEW.az * DEG) * Math.cos(VIEW.el * DEG), Math.sin(VIEW.el * DEG), Math.cos(VIEW.az * DEG) * Math.cos(VIEW.el * DEG));

// It frames a fixed height of its world: the pair is 0.73 of the host's height across at its widest, centered
// across the host, with the point the stream meets at the host's middle height.
function framing(): { target: THREE.Vector3; dist: number; strike: Anchor; span: [number, number] } {
  const cam = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.01, 10);
  const pts: THREE.Vector3[] = [];
  for (const c of [MOV, DIAL]) for (let k = 0; k < 96; k++) for (const y of [0, c === DIAL ? BODY.crystal : 6.4]) {
    const a = (k / 96) * Math.PI * 2;
    pts.push(toWorld(c.x + Math.cos(a) * (CASE.r + 0.4), y, c.z + Math.sin(a) * (CASE.r + 0.4)));
  }
  pts.push(toWorld(DIAL.x, 1, DIAL.z - PENDANT.to - CROWN.len - 10));
  const target = new THREE.Vector3(), p = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  let dist = 0.6, strike: Anchor = [0, 0], span: [number, number] = [0, 0];
  const at = (v: THREE.Vector3): Anchor => { p.copy(v).project(cam); return [p.x / 2, -p.y / 2]; };
  for (let it = 0; it < 60; it++) {
    cam.position.copy(target).addScaledVector(EYE_DIR, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    let lo = Infinity, hi = -Infinity, top = Infinity, bot = -Infinity;
    for (const c of pts) { const [x, y] = at(c); lo = Math.min(lo, x); hi = Math.max(hi, x); top = Math.min(top, y); bot = Math.max(bot, y); }
    strike = at(STRIKE_W);
    span = [top, bot];
    const vh = 2 * dist * Math.tan((VIEW.fov / 2) * DEG);
    right.setFromMatrixColumn(cam.matrixWorld, 0);
    up.setFromMatrixColumn(cam.matrixWorld, 1);
    target.addScaledVector(right, ((lo + hi) / 2) * vh).addScaledVector(up, -strike[1] * vh);
    dist *= (hi - lo) / VIEW.across;
  }
  return { target, dist, strike: [Number(strike[0].toFixed(4)), Number(strike[1].toFixed(4))], span };
}
const FRAME = framing();

export const WATCH: { strike: Anchor } = { strike: FRAME.strike };

const ROOM_LIGHT = new THREE.Color(hex('pale'));
// The lights are the CPU's: the two things are one family, seen from the same place at the same size.
const LAMP = { power: 0.045, reach: 0.34, height: 0.006, bound: 0.2 } as const;
const KEY = { power: 1.0, at: [-0.44, 0.3, -0.02] as const, soft: 2 };
const RIM = { power: 0.9, at: [0.12, 0.06, -0.42] as const, line: 3.2 };
// The strips stand where the dial and the movement's plate mirror them to the eye at rest, so each lies across one
// half as a long reflection that slides as the watch turns toward the cursor.
const STRIPS = [
  { power: 1.2, w: 0.5, h: 0.008, along: 0.36, tilt: -7, at: [MOV.x, 6, MOV.z] as const },
] as const;
// The dial's own light: a broad soft panel, so the face takes one broad highlight as the CPU's lid does, and the
// guilloché breaks it into rings. It stands wherever the face mirrors it to the eye at a point that follows the
// cursor across the face (follow: how far the point moves for the cursor's move, held within reach of the middle),
// so the highlight slides with the cursor and is never turned off the face by the watch's own turn.
const FACE = { power: 4, w: 0.03, h: 0.02, along: 0.3, follow: 0.2, reach: 0.55 } as const;
// A wider, dimmer panel round it, so the highlight has no hard edge and falls off softly across the face.
const HALO = { power: 0.4, w: 0.085, h: 0.06 } as const;
// The movement's own panel, broad and soft, mirrored by it the same way and following the cursor a little: lit
// evenly, each finish is as bright as its metal is, so the frosted plate stays dark, the gilt bridges come out a
// middle gold and the polished wheels the brightest things on it.
const WORKS = { power: 0.9, w: 0.1, h: 0.07, along: 0.3, follow: 0.08, reach: 0.3, y: 5 } as const;
const ENV = 0.3;
const FILL = 0.06;
const FLASH_KEY = { power: 18, at: [-0.4, 0.13, -0.32] as const, soft: 2.5, fill: 0 };
const STRIKE_LIGHT = { base: 0.0012, flash: 0.014 } as const;
const TURN = { yaw: 5, pitch: 3, omega: 6.5 } as const;
const MASK = 'linear-gradient(to right, transparent 2%, #000 12%, #000 88%, transparent 98%), linear-gradient(to bottom, transparent 5%, #000 11%, #000 89%, transparent 95%)';
const SHARDS_MOST = 64;
// The watch runs while this much of the stream is on it, and its balance swings with how much.
const RUNS = 0.12;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (k: number) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

let areaLib = false;

export function createWatch(): StruckPiece {
  let stage: Stage | null = null;
  let model: WatchModel | null = null;
  let life: Life | null = null;
  let runner: Runner | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let host: HTMLElement | null = null;
  let off: (() => void) | null = null;
  let ro: ResizeObserver | null = null;
  let io: IntersectionObserver | null = null;
  let visible = true;
  let hold: number | null = null;
  let lampUV = { x: 0.62, y: 0.3 };
  let lifeIn: { way: Way; age: number } = { way: 'shards', age: -1 };
  let streamIn = { on: 0, since: 60 };
  let forced: { az: number; el: number; d: number; at?: THREE.Vector3 } | null = null;
  let last = '';
  let ran = 0;
  const turn = new THREE.Group();
  const yaw = { x: 0, v: 0 }, pitch = { x: 0, v: 0 };
  let key: THREE.SpotLight | null = null;
  let rim: THREE.SpotLight | null = null;
  const strips: THREE.RectAreaLight[] = [];
  let face: THREE.RectAreaLight | null = null;
  let halo: THREE.RectAreaLight | null = null;
  let works: THREE.RectAreaLight | null = null;
  const faceAt = new THREE.Vector3(), faceN = new THREE.Vector3(), faceV = new THREE.Vector3(), faceHit = new THREE.Vector3();
  const facePlane = new THREE.Plane();
  let fill: THREE.HemisphereLight | null = null;
  let flashFill: THREE.HemisphereLight | null = null;
  let strikeLight: THREE.PointLight | null = null;
  let shards: THREE.InstancedMesh[] = [];
  let shadowU: { value: THREE.Vector2 } | null = null;
  const su = shardUniforms();
  const partData = new Float32Array(PART_TEXELS * PARTS_MAX * 4);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Matrix4();
  const color = new THREE.Color();
  const eye = new THREE.Vector3();
  const KEY_AT = new THREE.Vector3(...KEY.at), FLASH_AT = new THREE.Vector3(...FLASH_KEY.at);
  const ROOM = ROOM_LIGHT.clone(), HOT = ROOM_LIGHT.clone();
  const rimDir = new THREE.Vector3();
  let built = 0, first = 0;

  const time = () => hold ?? clock.now();
  const still = () => clock.isFrozen() || hold !== null;
  const quiet = () => stage?.tier === 'static' || matchMedia('(prefers-reduced-motion: reduce)').matches;

  const place = () => {
    if (!stage) return;
    const cam = stage.camera;
    if (forced) {
      const a = forced.az * DEG, e = forced.el * DEG, c = forced.at ?? new THREE.Vector3();
      cam.position.set(c.x - forced.d * Math.cos(e) * Math.sin(a), c.y + forced.d * Math.sin(e), c.z + forced.d * Math.cos(e) * Math.cos(a));
      cam.lookAt(c);
    } else {
      cam.position.copy(FRAME.target).addScaledVector(EYE_DIR, FRAME.dist);
      cam.lookAt(FRAME.target);
    }
    cam.updateMatrixWorld(true);
  };

  // The cursor's light stands where the table mirrors the eye at the point under the cursor, so its highlight is
  // under the cursor. Far off the host, that point is kept within reach and still lies the cursor's way.
  const placeLamp = () => {
    if (!stage) return;
    ndc.set(clamp(lampUV.x * 2 - 1, -4, 4), clamp(1 - lampUV.y * 2, -4, 4));
    ray.setFromCamera(ndc, stage.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const k = (LAMP.height - o.y) / Math.min(-0.05, d.y);
    const p = o.clone().addScaledVector(d, k);
    const r = Math.hypot(p.x, p.z);
    if (r > LAMP.bound) { p.x *= LAMP.bound / r; p.z *= LAMP.bound / r; }
    const m = new THREE.Vector3(d.x, -d.y, d.z).normalize();
    stage.lamp.position.copy(p).addScaledVector(m, LAMP.reach);
    stage.lamp.target.position.set(p.x * 0.5, 0, p.z * 0.5);
    stage.lamp.target.updateMatrixWorld();
  };

  const spring = (s: { x: number; v: number }, goal: number, dt: number) => {
    if (still() || quiet()) { s.x = goal; s.v = 0; return; }
    if (dt <= 0) return;
    const w = TURN.omega, step = Math.min(dt, 1 / 30);
    s.v += (w * w * (goal - s.x) - 2 * w * s.v) * step;
    s.x += s.v * step;
    if (Math.abs(goal - s.x) < 1e-5 && Math.abs(s.v) < 1e-5) { s.x = goal; s.v = 0; }
  };

  const apply = (L: LifeAt, on: number, since: number, t: number) => {
    if (!stage || !model || !key || !rim || !fill || !flashFill || !strikeLight) return;
    const u = model.u;
    turn.visible = L.show;
    turn.position.copy(STRIKE_W);
    turn.rotation.set(pitch.x * DEG, yaw.x * DEG, 0, 'YXZ');
    model.root.position.copy(STRIKE_W).multiplyScalar(-1);
    place();
    turn.updateMatrixWorld(true);
    (u.uParts.value.image.data as Float32Array).set(partData);
    u.uParts.value.needsUpdate = true;
    const lightsOn = L.lit >= 0 ? smooth(L.lit / 0.05) : 0;
    u.uGlow.value = on * lightsOn;
    u.uLit.value = t - L.lit;
    u.uTime.value = t;
    u.uStatic.value = quiet() ? 1 : 0;
    u.uBandOn.value = L.band ? 1 : 0;
    if (L.band) u.uBand.value.set(L.band.c[0], L.band.c[1], L.band.r, L.band.k);
    u.uEye.value.copy(model.root.worldToLocal(eye.copy(stage.camera.position)));
    if (shadowU) shadowU.value.set(...L.shadow);
    const room = L.show ? L.room : 0;
    const w = L.show ? smooth(L.flash * 1.3) : 0;
    key.position.copy(KEY_AT).lerp(FLASH_AT, w);
    key.color.copy(ROOM).lerp(HOT, w);
    key.intensity = KEY.power * room * (1 - w) + FLASH_KEY.power * w;
    key.shadow.radius = KEY.soft + (FLASH_KEY.soft - KEY.soft) * w;
    rim.intensity = RIM.power * room;
    rimDir.set(...RIM.at).normalize().transformDirection(stage.camera.matrixWorldInverse);
    u.uRim.value.set(rimDir.x, rimDir.y, rimDir.z, RIM.line * Math.max(room, w));
    fill.intensity = FILL * room;
    flashFill.intensity = FLASH_KEY.fill * w;
    stage.scene.environmentIntensity = ENV * (0.1 + 0.9 * Math.max(room, 1.3 * w));
    strips.forEach((st, i) => { st.intensity = STRIPS[i].power * Math.max(room, 1.2 * w); });
    // A panel stands where the face at (x, y, z) mirrors it to the eye, at a point that follows the cursor.
    const root = model.root, cam = stage.camera;
    const mirror = (l: THREE.RectAreaLight, x: number, y: number, z: number, o: { along: number; follow: number; reach: number }, r: number) => {
      const mid = root.localToWorld(faceAt.set(x, y, z));
      faceN.set(0, 1, 0).applyQuaternion(turn.quaternion);
      facePlane.setFromNormalAndCoplanarPoint(faceN, mid);
      ndc.set(clamp(lampUV.x * 2 - 1, -3, 3), clamp(1 - lampUV.y * 2, -3, 3));
      ray.setFromCamera(ndc, cam);
      if (ray.ray.intersectPlane(facePlane, faceHit)) {
        faceHit.sub(mid).multiplyScalar(o.follow);
        const most = r * MM * o.reach;
        if (faceHit.length() > most) faceHit.setLength(most);
        faceHit.add(mid);
      } else faceHit.copy(mid);
      faceV.copy(cam.position).sub(faceHit).normalize();
      faceV.reflect(faceN).negate();
      l.position.copy(faceHit).addScaledVector(faceV, o.along);
      l.lookAt(faceHit);
    };
    if (works) {
      mirror(works, MOV.x, WORKS.y, MOV.z, WORKS, CASE.r);
      works.intensity = WORKS.power * Math.max(room, 1.2 * w);
    }
    if (face) {
      mirror(face, DIAL.x, DIAL_FACE.y, DIAL.z, FACE, DIAL_FACE.r);
      face.intensity = FACE.power * Math.max(room, 1.2 * w);
      if (halo) { halo.position.copy(face.position); halo.quaternion.copy(face.quaternion); halo.intensity = HALO.power * Math.max(room, 1.2 * w); }
    }
    stage.lamp.intensity = LAMP.power * room;
    const flash = since >= 0 && since < 1.5 ? Math.exp(-since / 0.12) * Math.min(1, since / 0.02) : 0;
    strikeLight.intensity = L.show ? on * STRIKE_LIGHT.base + STRIKE_LIGHT.flash * flash : 0;
    const W = stage.width, H = stage.height;
    const unit = H / 220;
    su.uHost.value.set(W, H);
    su.uPx.value = H / (2 * FRAME.dist * Math.tan((VIEW.fov / 2) * DEG));
    su.uDepth.value = FRAME.dist;
    su.uCoreAt.value.set(W / 2 + FRAME.strike[0] * H, H / 2 + FRAME.strike[1] * H);
    su.uUnit.value = unit;
    su.uDpr.value = stage.renderer.getPixelRatio();
    su.uLamp.value.set(lampUV.x * W, lampUV.y * H, 120 * unit);
    su.uLampI.value = 0.5 * (0.3 + 0.7 * room);
    su.uExposure.value = stage.renderer.toneMappingExposure;
    const counts = new Array<number>(SHARD_KINDS).fill(0);
    for (const s of L.shards) {
      const mesh = shards[s.kind], n = counts[s.kind];
      if (!mesh || n >= SHARDS_MOST) continue;
      tmp.compose(s.p, s.q, s.s);
      mesh.setMatrixAt(n, tmp);
      const sp = model.root.localToWorld(eye.copy(s.p)).project(stage.camera);
      const dx = lampUV.x * W - (sp.x * 0.5 + 0.5) * W, dy = lampUV.y * H - (0.5 - sp.y * 0.5) * H;
      mesh.setColorAt(n, color.setRGB(s.lit, Math.exp(-(dx * dx + dy * dy) / (170 * unit) ** 2), 0));
      counts[s.kind] = n + 1;
    }
    shards.forEach((m, k) => {
      m.count = counts[k];
      m.visible = counts[k] > 0;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
    placeLamp();
  };

  // Where the watch stands in its running: how long it has run, how far its balance swings, its lights.
  const running = (lit: number, on: number, since: number) => {
    const amp = quiet() ? 0 : smooth(on / 0.6) * (lit >= 0 ? smooth(lit / 0.25) : 0);
    const tau = still() ? Math.max(0, since - 0.3) : ran;
    const glow = on * (lit >= 0 ? smooth(lit / 0.05) : 0);
    return runner!.at(tau, amp, lit, glow, quiet());
  };

  let held = false, owed = 0;
  const frame = (step = 0, force = false) => {
    if (!stage || !model || !life || !runner || !visible) return;
    owed += step;
    if (!force && !myTurn(SIDE.small)) return;
    const dt = owed;
    owed = 0;
    if (stage.tier === 'static' && held && !force && !clock.isFrozen()) return;
    const t = time();
    const lv = lifeIn, sv = streamIn;
    const litNow = lv.age - LIGHTS[lv.way];
    if (!still() && sv.on > RUNS && litNow >= 0 && !quiet()) ran += dt;
    const R = running(litNow, sv.on, sv.since);
    const L = life.at(lv.way, lv.age, partData, R.spin, R.light, R.arc);
    model.u.uSpring.value = R.spring;
    model.u.uJewels.value.forEach((v, k) => v.copy(R.jewels[k]));
    spring(yaw, clamp((lampUV.x - 0.5) * 2, -1, 1) * TURN.yaw, dt);
    spring(pitch, clamp((lampUV.y - 0.5) * 2, -1, 1) * TURN.pitch, dt);
    const alive = sv.on > 0.0005 && L.lit >= 0 && !quiet();
    const len = LIFE[lv.way];
    const sig = [
      lampUV.x.toFixed(4), lampUV.y.toFixed(4), lv.way, lv.age <= 0 ? 'none' : lv.age >= len + 0.6 ? 'whole' : lv.age.toFixed(4), sv.on.toFixed(4),
      sv.on > 0 && sv.since < 1.5 ? sv.since.toFixed(3) : '-', yaw.x.toFixed(4), pitch.x.toFixed(4), stage.width, stage.height, alive ? `${t.toFixed(4)}:${ran.toFixed(4)}` : '-', stage.tier,
      forced ? `${forced.az},${forced.el},${forced.d},${forced.at?.toArray().join(',') ?? ''}` : '-', still() ? sv.since.toFixed(3) : '-',
    ].join('|');
    if (sig === last && !force) return;
    last = sig;
    apply(L, sv.on, sv.since, t);
    stage.render();
    held = true;
  };

  const noAO = () => {
    if (!stage) return;
    for (const p of stage.composer.passes) if (p instanceof GTAOPass) p.enabled = false;
  };

  const piece: StruckPiece = {
    async mount(h: HTMLElement, opts: PieceOptions) {
      host = h;
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      canvas.style.setProperty('mask-image', MASK);
      canvas.style.setProperty('-webkit-mask-image', MASK);
      canvas.style.setProperty('mask-composite', 'intersect');
      canvas.style.setProperty('-webkit-mask-composite', 'source-in');
      h.appendChild(canvas);
      if (!areaLib) { RectAreaLightUniformsLib.init(); areaLib = true; }
      stage = new Stage(h, canvas, { tier: opts.tier, fov: VIEW.fov, near: 0.05, far: 3, env: 'studio', envIntensity: ENV, bloom: { strength: 0.3, threshold: 3.4, radius: 0 }, lampTarget: [0, 0, 0], lampAngle: 0.62, exposure: 1.15 });
      trueDarks(stage.renderer);
      balance(stage);
      noAO();
      stage.bloom.enabled = false;
      stage.lamp.penumbra = 0.9;
      stage.lamp.color.copy(ROOM_LIGHT);
      stage.lamp.shadow.camera.near = 0.05;
      stage.lamp.shadow.camera.far = 1.2;
      stage.lamp.shadow.bias = -0.0004;
      stage.lamp.shadow.normalBias = 0.0006;
      stage.lamp.shadow.radius = 3;
      const t0 = performance.now();
      model = await buildWatch();
      model.root.rotation.y = YAW;
      built = Math.round(performance.now() - t0);
      life = new Life(model.parts);
      runner = new Runner(model.parts);
      shadowU = (model.shadow.material as THREE.ShaderMaterial).uniforms.uShadow as { value: THREE.Vector2 };
      const s = stage.scene;
      turn.add(model.root);
      s.add(turn);
      place();
      turn.position.copy(STRIKE_W);
      model.root.position.copy(STRIKE_W).multiplyScalar(-1);
      turn.updateMatrixWorld(true);
      key = new THREE.SpotLight(ROOM_LIGHT, KEY.power, 0, 0.42, 0.85, 2);
      key.position.copy(KEY_AT);
      key.target.position.set(0, 0, 0);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0002;
      key.shadow.normalBias = 0.0008;
      key.shadow.radius = KEY.soft;
      key.shadow.camera.near = 0.2;
      key.shadow.camera.far = 0.9;
      rim = new THREE.SpotLight(ROOM_LIGHT, RIM.power, 0, 0.5, 0.6, 2);
      rim.position.set(...RIM.at);
      rim.target.position.set(0.01, 0.004, 0);
      const mirror = EYE_DIR.clone().multiply(new THREE.Vector3(-1, 1, -1));
      for (const st of STRIPS) {
        const at = toWorld(st.at[0], st.at[1], st.at[2]);
        const dir = mirror.clone().applyAxisAngle(new THREE.Vector3(mirror.z, 0, -mirror.x).normalize(), st.tilt * DEG);
        const l = new THREE.RectAreaLight(ROOM_LIGHT, st.power, st.w, st.h);
        l.position.copy(at).addScaledVector(dir, st.along);
        l.lookAt(at);
        strips.push(l);
        s.add(l);
      }
      face = new THREE.RectAreaLight(ROOM_LIGHT, FACE.power, FACE.w, FACE.h);
      halo = new THREE.RectAreaLight(ROOM_LIGHT, HALO.power, HALO.w, HALO.h);
      works = new THREE.RectAreaLight(ROOM_LIGHT, WORKS.power, WORKS.w, WORKS.h);
      s.add(face, halo, works);
      fill = new THREE.HemisphereLight(ROOM_LIGHT.clone().multiplyScalar(0.6), new THREE.Color(hex('bg-3')), FILL);
      strikeLight = new THREE.PointLight(hex('hot'), 0, 0, 2);
      strikeLight.position.copy(toWorld(STRIKE.x - 10, 4, STRIKE.z - 6));
      flashFill = new THREE.HemisphereLight(new THREE.Color(hex('hot')), new THREE.Color(hex('ember-deep')), 0);
      // Every light stands in the scene and is never hidden, only dimmed, so no program is built again mid strike.
      s.add(key, key.target, rim, rim.target, fill, flashFill, strikeLight);
      shards = shardMeshes(su, SHARDS_MOST);
      for (const m of shards) model.root.add(m);
      stage.resize();
      const t1 = performance.now();
      apply(life.at(lifeIn.way, lifeIn.age, partData), 0, 60, time());
      await stage.warm();
      for (const way of WAYS) for (const k of [0.04, 0.2, 0.45, 0.7, 0.9, 2]) for (const on of [0, 1]) {
        apply(life.at(way, LIFE[way] * k, partData), on, on ? 0.05 : 60, 3);
        for (const m of shards) { m.visible = true; m.count = Math.max(m.count, 1); }
        stage.render();
      }
      apply(life.at(lifeIn.way, lifeIn.age, partData), 0, 60, time());
      stage.render();
      first = Math.round(performance.now() - t1);
      ro = new ResizeObserver(() => { stage?.resize(); frame(0, true); });
      ro.observe(h);
      io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) frame(0, true); });
      io.observe(h);
      off = clock.onFrame((_, dt) => frame(dt));
      frame(0, true);
      opts.onReady?.();
    },
    setLamp(x, y) { lampUV = { x, y }; },
    setProgress() {},
    setWaterLight() {},
    setMaking(on) { if (stage && model) stage.setMaking(on, model.root); frame(0, true); },
    setTier(tier: Tier) { if (stage) { stage.setTier(tier); balance(stage); } noAO(); frame(0, true); },
    freeze(t) { hold = t; frame(0, true); },
    view(az, el, dist) { forced = { az, el, d: dist }; frame(0, true); },
    setStream(on, since) { streamIn = { on: clamp(on, 0, 1), since }; },
    setLife(way, age) { lifeIn = { way, age }; },
    dispose() {
      off?.(); ro?.disconnect(); io?.disconnect();
      stage?.dispose(); canvas?.remove();
      stage = null; model = null; life = null; runner = null; host = null;
    },
  };
  Object.assign(piece, {
    // Where the stream meets it, measured from the frame as drawn now, in host heights from the host's middle.
    measure(): Anchor | null {
      if (!stage || !host) return null;
      model?.root.updateMatrixWorld(true);
      const p = STRIKE_W.clone().project(stage.camera);
      return [(p.x * stage.width) / stage.height / 2, -p.y / 2];
    },
    where(x: number, y: number, z: number): Anchor | null {
      if (!stage || !model) return null;
      model.root.updateMatrixWorld(true);
      const p = model.root.localToWorld(new THREE.Vector3(x, y, z)).project(stage.camera);
      return [(p.x * stage.width) / stage.height / 2, -p.y / 2];
    },
    // How far every vertex of the watch at rest reaches, in host heights from the host's middle: left, top, right,
    // bottom, and which kind of part reaches the top.
    bounds() {
      if (!stage || !model) return null;
      model.root.updateMatrixWorld(true);
      const v = new THREE.Vector3(), b = [Infinity, Infinity, -Infinity, -Infinity];
      let topKind = '';
      for (const m of model.meshes) {
        const pos = m.geometry.getAttribute('position'), cell = m.geometry.getAttribute('cell');
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).project(stage.camera);
          const x = (v.x * stage.width) / stage.height / 2, y = -v.y / 2;
          b[0] = Math.min(b[0], x); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
          if (y < b[1]) { b[1] = y; topKind = model.parts[Math.round(cell.getW(i))]?.kind ?? ''; }
        }
      }
      return { box: b.map((n) => Number(n.toFixed(4))), topKind };
    },
    // A close look at a point of the model, in millimetres, for building it.
    look(x: number, y: number, z: number, az = VIEW.az, el = VIEW.el, dist = 0.12) {
      if (!model) return;
      model.root.updateMatrixWorld(true);
      forced = { az, el, d: dist, at: model.root.localToWorld(new THREE.Vector3(x, y, z)) };
      frame(0, true);
    },
    stats() {
      const i = stage?.renderer.info;
      return { triangles: model?.tris ?? 0, spend: model?.spend, drawn: i?.render.triangles ?? 0, calls: i?.render.calls ?? 0, programs: i?.programs?.length ?? 0, built, first, frameMs: stage?.frameMs ?? 0, anchor: WATCH.strike, span: FRAME.span, dist: FRAME.dist };
    },
    info() { return (piece as unknown as { stats(): unknown }).stats(); },
  });
  return piece;
}

export default createWatch;
