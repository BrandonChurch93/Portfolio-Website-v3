import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import type { PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import { WAYS, type Anchor, type StruckPiece, type Way } from '../../world/struck';
import { MONO, SANS } from './art';
import { BOARD, BUNDLES, DEG, SOCKET, STRIKE } from './layout';
import { LIFE, Life, type LifeAt } from './life';
import { buildCpu, type CpuModel } from './model';
import { PARTS_MAX, PART_TEXELS } from './shading';
import { shardGeometry, shardMaterial } from './shard';

// The processor in its socket, at the left of the first row of skills. It is not on the page until the stream
// strikes it, and comes on in one of three ways (./life.ts). With the stream on it, light pulses out of the seam
// round the processor and runs out along the traces.

export { LIFE };

// From above and the front left, narrow, so it reads as a square lying on a table. It frames a fixed height of its
// world: the board is 0.73 of the host's height across, centered across the host, with the corner the stream meets
// at the host's middle height.
const VIEW = { az: 28, el: 50, fov: 18, across: 0.73 } as const;
const MM = 0.001;
const STRIKE_W = new THREE.Vector3(STRIKE.x, STRIKE.y, STRIKE.z).multiplyScalar(MM);

function framing(): { target: THREE.Vector3; dist: number; strike: Anchor } {
  const cam = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.01, 10);
  const dir = new THREE.Vector3(-Math.sin(VIEW.az * DEG) * Math.cos(VIEW.el * DEG), Math.sin(VIEW.el * DEG), Math.cos(VIEW.az * DEG) * Math.cos(VIEW.el * DEG));
  const h = BOARD.half * MM, t = BOARD.thick * MM;
  const corners: THREE.Vector3[] = [];
  for (const x of [-h, h]) for (const z of [-h, h]) for (const y of [0, -t]) corners.push(new THREE.Vector3(x, y, z));
  const target = new THREE.Vector3(), p = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  let dist = 0.6, strike: Anchor = [0, 0];
  const at = (v: THREE.Vector3): Anchor => { p.copy(v).project(cam); return [p.x / 2, -p.y / 2]; };
  for (let it = 0; it < 60; it++) {
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    let lo = Infinity, hi = -Infinity;
    for (const c of corners) { const [x] = at(c); lo = Math.min(lo, x); hi = Math.max(hi, x); }
    strike = at(STRIKE_W);
    const vh = 2 * dist * Math.tan((VIEW.fov / 2) * DEG);
    right.setFromMatrixColumn(cam.matrixWorld, 0);
    up.setFromMatrixColumn(cam.matrixWorld, 1);
    target.addScaledVector(right, ((lo + hi) / 2) * vh).addScaledVector(up, -strike[1] * vh);
    dist *= (hi - lo) / VIEW.across;
  }
  return { target, dist, strike: [Number(strike[0].toFixed(4)), Number(strike[1].toFixed(4))] };
}
const FRAME = framing();

export const CPU: { strike: Anchor } = { strike: FRAME.strike };

// The lights. The cursor's light sits where the board would mirror it to the eye at the point under the cursor, so
// its highlight crosses the lid and the mask with the cursor.
const LAMP = { power: 0.11, reach: 0.34, height: 0.004, bound: 0.2 } as const;
// The key stands high behind the far side, turned well away from where flat faces would mirror it to the eye: what
// catches it is the top of every part and each rounded edge, and each part throws a short shadow toward the near left.
const KEY = { power: 2.2, at: [0.3, 0.33, -0.1] as const };
// A thin rim low from the left, for the left faces of the parts.
// A narrow light for the lid alone, standing where the lid mirrors it to the eye at rest: the lid carries a soft lit
// streak in its brushing wherever the cursor is.
const LID = { power: 0.06, reach: 0.34, angle: 0.085 } as const;
const RIM = { power: 2.2, at: [-0.32, 0.075, -0.05] as const };
const ENV = 0.36;
const FILL = 0.04;
const STRIKE_LIGHT = { base: 0.012, flash: 0.04, life: 0.06 } as const;
// The flash way's first light: an even wash in the stream's colour that throws no glint, from the strike's side.
const FLASH_FILL = 4;
const BAND_LIGHT = 0.03;
const TURN = { yaw: 5, pitch: 3, omega: 6.5 } as const;
// The canvas fades out at its rim, and fully outside the middle of the host's height where the row's borders run.
const MASK = 'linear-gradient(to right, transparent 2%, #000 12%, #000 88%, transparent 98%), linear-gradient(to bottom, transparent 5%, #000 11%, #000 89%, transparent 95%)';
// The bloom keeps to its finest levels, so a glow stays within a few pixels of what makes it and never fills the canvas.
const BLOOM_LEVELS = [1.0, 0.45, 0.08, 0, 0];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const cpuH = (n: number) => { n = (n * 0.1031) % 1; if (n < 0) n += 1; n *= n + 33.33; n *= n + n; return n % 1; };

// How brightly the seam flares as the waves leave it: the same schedule as the shader's, summed over the bundles.
function seam(t: number): number {
  let s = 0;
  for (let b = 0; b < BUNDLES.length; b++) {
    const tau = t * (0.95 + 0.4 * cpuH(b * 7.13 + 1)) + cpuH(b * 3.31 + 2) * 5;
    const k0 = Math.floor(tau);
    for (let j = 0; j < 2; j++) {
      const k = k0 - j, key = k * 1.618 + b * 17;
      const e = k + 0.5 * cpuH(key + 0.5);
      const amp = (0.55 + 0.45 * cpuH(key + 1.5)) * (cpuH(key + 2.5) >= 0.12 ? 1 : 0);
      const x = tau - e;
      if (x >= -0.2) s += amp * Math.exp(-(((x - 0.02) / 0.09) ** 2));
    }
  }
  return 0.28 + 0.48 * Math.min(1.5, s);
}

export function createCpu(): StruckPiece {
  let stage: Stage | null = null;
  let model: CpuModel | null = null;
  let life: Life | null = null;
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
  let forced: { az: number; el: number; d: number } | null = null;
  let last = '';
  const turn = new THREE.Group();
  const yaw = { x: 0, v: 0 }, pitch = { x: 0, v: 0 };
  let key: THREE.SpotLight | null = null;
  let rim: THREE.SpotLight | null = null;
  let lidLight: THREE.SpotLight | null = null;
  let fill: THREE.HemisphereLight | null = null;
  let flashFill: THREE.HemisphereLight | null = null;
  let strikeLight: THREE.PointLight | null = null;
  let bandLight: THREE.PointLight | null = null;
  let shards: THREE.InstancedMesh | null = null;
  let boardMat: THREE.Material | null = null;
  const partData = new Float32Array(PART_TEXELS * PARTS_MAX * 4);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Matrix4();
  const one = new THREE.Vector3();
  const color = new THREE.Color();

  const time = () => hold ?? clock.now();
  const still = () => clock.isFrozen() || hold !== null;
  const quiet = () => stage?.tier === 'static' || matchMedia('(prefers-reduced-motion: reduce)').matches;

  const place = () => {
    if (!stage) return;
    const cam = stage.camera;
    if (forced) {
      const a = forced.az * DEG, e = forced.el * DEG, c = new THREE.Vector3(0, 0, 0);
      cam.position.set(c.x - forced.d * Math.cos(e) * Math.sin(a), c.y + forced.d * Math.sin(e), c.z + forced.d * Math.cos(e) * Math.cos(a));
      cam.lookAt(c);
    } else {
      const dir = new THREE.Vector3(-Math.sin(VIEW.az * DEG) * Math.cos(VIEW.el * DEG), Math.sin(VIEW.el * DEG), Math.cos(VIEW.az * DEG) * Math.cos(VIEW.el * DEG));
      cam.position.copy(FRAME.target).addScaledVector(dir, FRAME.dist);
      cam.lookAt(FRAME.target);
    }
    cam.updateMatrixWorld(true);
  };

  // The cursor's light: the ray through the cursor meets the board's top at P, and the light stands where the board
  // mirrors the eye's ray at P, so the highlight is under the cursor. Far off the host, P is kept within reach and
  // still lies the cursor's way.
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
    if (still() || quiet() || dt <= 0) { if (still() || quiet()) { s.x = goal; s.v = 0; } return; }
    const w = TURN.omega, step = Math.min(dt, 1 / 30);
    s.v += (w * w * (goal - s.x) - 2 * w * s.v) * step;
    s.x += s.v * step;
    if (Math.abs(goal - s.x) < 1e-5 && Math.abs(s.v) < 1e-5) { s.x = goal; s.v = 0; }
  };

  const apply = (L: LifeAt, on: number, since: number, t: number) => {
    if (!stage || !model || !key || !fill || !strikeLight || !bandLight || !shards) return;
    const u = model.u;
    turn.visible = L.show;
    turn.position.copy(STRIKE_W);
    turn.rotation.set(pitch.x * DEG, yaw.x * DEG, 0, 'YXZ');
    model.root.position.copy(STRIKE_W).multiplyScalar(-1);
    (u.uParts.value.image.data as Float32Array).set(partData);
    u.uParts.value.needsUpdate = true;
    const glow = on * L.lights;
    u.uGlow.value = glow;
    u.uFront.value = L.front;
    u.uTime.value = t;
    u.uStatic.value = quiet() ? 1 : 0;
    u.uSeam.value = quiet() ? 0.62 : seam(t);
    u.uBandOn.value = L.band ? 1 : 0;
    if (L.band) u.uBand.value.set(L.band.c[0], L.band.c[1], L.band.r, L.band.k);
    (model.shadow.material as THREE.ShaderMaterial).uniforms.uShadow.value = L.shadow;
    const seat = (boardMat?.userData.uniforms as { uSeat?: { value: number } } | undefined)?.uSeat;
    if (seat) seat.value = L.seat;
    const room = L.show ? L.room : 0;
    key.intensity = KEY.power * room;
    if (rim) rim.intensity = RIM.power * room;
    if (lidLight) lidLight.intensity = LID.power * room * L.lid;
    fill.intensity = FILL * room;
    stage.scene.environmentIntensity = ENV * (0.08 + 0.92 * room);
    stage.lamp.intensity = LAMP.power * room;
    // The strike's flash is the stream's leading end arriving, so it does not wait for the stream to come up.
    const flash = since >= 0 && since < 1.5 ? Math.exp(-since / 0.12) * Math.min(1, since / 0.02) : 0;
    if (flashFill) flashFill.intensity = L.show ? FLASH_FILL * (L.flash + 0.35 * flash) : 0;
    strikeLight.intensity = L.show ? on * STRIKE_LIGHT.base + STRIKE_LIGHT.flash * flash + STRIKE_LIGHT.life * L.flash : 0;
    model.led.emissiveIntensity = L.show ? L.lights * 2.4 : 0;
    if (L.band) {
      const a = Math.atan2(BOARD.half - L.band.c[1], BOARD.half - L.band.c[0]);
      bandLight.position.set((L.band.c[0] + Math.cos(a) * (L.band.r - 6)) * MM, 0.009, (L.band.c[1] + Math.sin(a) * (L.band.r - 6)) * MM);
      bandLight.intensity = BAND_LIGHT * L.band.k;
    } else bandLight.intensity = 0;
    shards.count = L.shards.length;
    L.shards.forEach((s, i) => {
      tmp.compose(s.p, s.q, s.size);
      shards!.setMatrixAt(i, tmp);
      shards!.setColorAt(i, color.setRGB(s.glow, 0, 0));
    });
    shards.instanceMatrix.needsUpdate = true;
    if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
    place();
    placeLamp();
  };

  let held = false;
  const frame = (dt = 0, force = false) => {
    if (!stage || !model || !life || !visible) return;
    if (stage.tier === 'static' && held && !force && !clock.isFrozen()) return;
    const t = time();
    const lv = lifeIn, sv = streamIn;
    const L = life.at(lv.way, lv.age, partData);
    spring(yaw, clamp((lampUV.x - 0.5) * 2, -1, 1) * TURN.yaw, dt);
    spring(pitch, clamp((lampUV.y - 0.5) * 2, -1, 1) * TURN.pitch, dt);
    const pulsing = sv.on * L.lights > 0.0005 && !quiet();
    const len = LIFE[lv.way];
    const sig = [
      lampUV.x.toFixed(4), lampUV.y.toFixed(4), lv.way, lv.age <= 0 ? 'none' : lv.age >= len ? 'whole' : lv.age.toFixed(4), sv.on.toFixed(4),
      sv.on > 0 && sv.since < 1.5 ? sv.since.toFixed(3) : '-', yaw.x.toFixed(4), pitch.x.toFixed(4), stage.width, stage.height, pulsing ? t.toFixed(4) : '-', stage.tier,
      forced ? `${forced.az},${forced.el},${forced.d}` : '-',
    ].join('|');
    if (sig === last && !force) return;
    last = sig;
    apply(L, sv.on, sv.since, t);
    stage.render();
    held = true;
  };

  const noAO = () => { if (stage) for (const p of stage.composer.passes) if (p instanceof GTAOPass) p.enabled = false; };

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
      await Promise.all([`500 20px ${MONO}`, `600 20px ${MONO}`, `700 20px ${MONO}`, `300 20px ${SANS}`, `600 20px ${SANS}`].map((f) => document.fonts.load(f).catch(() => null)));
      stage = new Stage(h, canvas, { tier: opts.tier, fov: VIEW.fov, near: 0.05, far: 3, env: 'studio', envIntensity: ENV, bloom: { strength: 0.3, threshold: 1.6, radius: 0 }, lampTarget: [0, 0, 0], lampAngle: 0.62, exposure: 1.2 });
      noAO();
      (stage.bloom.compositeMaterial.uniforms.bloomFactors as { value: number[] }).value = BLOOM_LEVELS;
      stage.lamp.penumbra = 0.9;
      stage.lamp.color.set(hex('pale')).lerp(new THREE.Color(hex('hot')), 0.45);
      stage.lamp.shadow.camera.near = 0.05;
      stage.lamp.shadow.camera.far = 1.2;
      stage.lamp.shadow.bias = -0.0004;
      stage.lamp.shadow.normalBias = 0.0006;
      stage.lamp.shadow.radius = 3;
      model = await buildCpu();
      life = new Life(model.parts);
      boardMat = model.meshes.find((m) => (m.material as THREE.Material).name === 'cpuBoard')?.material as THREE.Material ?? null;
      const s = stage.scene;
      turn.add(model.root);
      s.add(turn);
      key = new THREE.SpotLight(hex('pale'), KEY.power, 0, 0.42, 0.85, 2);
      key.position.set(...KEY.at);
      key.target.position.set(0, 0, 0);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0002;
      key.shadow.normalBias = 0.0012;
      key.shadow.radius = 2.5;
      key.shadow.camera.near = 0.2;
      key.shadow.camera.far = 0.8;
      rim = new THREE.SpotLight(hex('pale'), RIM.power, 0, 0.5, 0.6, 2);
      rim.position.set(...RIM.at);
      rim.target.position.set(0.01, 0.004, 0);
      s.add(rim, rim.target);
      {
        const c = new THREE.Vector3(SOCKET.x, 5.35, SOCKET.z).multiplyScalar(MM);
        place();
        const eye = stage.camera.position.clone().sub(c).normalize();
        lidLight = new THREE.SpotLight(new THREE.Color(hex('pale')).lerp(new THREE.Color(hex('hot')), 0.5), LID.power, 0, LID.angle, 0.7, 2);
        lidLight.position.copy(c).addScaledVector(new THREE.Vector3(-eye.x, eye.y, -eye.z), LID.reach);
        lidLight.target.position.copy(c);
        s.add(lidLight, lidLight.target);
      }
      fill = new THREE.HemisphereLight(new THREE.Color(hex('pale')).multiplyScalar(0.6), new THREE.Color(hex('ember-deep')), FILL);
      strikeLight = new THREE.PointLight(hex('hot'), 0, 0, 2);
      strikeLight.position.set((STRIKE.x - 12) * MM, 4 * MM, (STRIKE.z - 12) * MM);
      bandLight = new THREE.PointLight(hex('hot'), 0, 0, 2);
      // Every light stands in the scene itself and is never hidden, only dimmed: a light that comes or goes changes
      // every program, and three would build them all again in the middle of the strike.
      s.add(strikeLight, bandLight);
      flashFill = new THREE.HemisphereLight(new THREE.Color(hex('hot')), new THREE.Color(hex('ember-deep')), 0);
      s.add(key, key.target, fill, flashFill);
      shards = new THREE.InstancedMesh(shardGeometry(), shardMaterial(), PARTS_MAX);
      shards.setColorAt(0, color.setRGB(0, 0, 0));
      shards.count = 0;
      shards.frustumCulled = false;
      shards.userData.noWire = true;
      model.root.add(shards);
      stage.resize();
      place();
      apply(life.at(lifeIn.way, lifeIn.age, partData), 0, 60, time());
      await stage.warm();
      // Draws every state it can be in once, so no program is first needed in the middle of a strike.
      for (const way of WAYS) for (const k of [0.04, 0.2, 0.45, 0.7, 0.9, 2]) for (const on of [0, 1]) {
        apply(life.at(way, LIFE[way] * k, partData), on, on ? 0.05 : 60, 3);
        stage.render();
      }
      apply(life.at(lifeIn.way, lifeIn.age, partData), 0, 60, time());
      stage.render();
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
    setTier(tier: Tier) { stage?.setTier(tier); noAO(); frame(0, true); },
    freeze(t) { hold = t; frame(0, true); },
    view(az, el, dist) { forced = { az, el, d: dist }; frame(0, true); },
    setStream(on, since) { streamIn = { on: clamp(on, 0, 1), since }; },
    setLife(way, age) { lifeIn = { way, age }; },
    dispose() {
      off?.(); ro?.disconnect(); io?.disconnect();
      stage?.dispose(); canvas?.remove();
      stage = null; model = null; life = null; host = null;
    },
  };
  Object.assign(piece, {
    // Where the stream meets it, measured from the frame as drawn now, in host heights from the host's middle.
    measure(): Anchor | null {
      if (!stage || !host) return null;
      const p = new THREE.Vector3();
      model?.root.updateMatrixWorld(true);
      turn.updateMatrixWorld(true);
      p.copy(STRIKE_W);
      p.project(stage.camera);
      return [(p.x * stage.width) / stage.height / 2, -p.y / 2];
    },
    info() { const i = stage?.renderer.info.render; return { triangles: i?.triangles ?? 0, calls: i?.calls ?? 0, frameMs: stage?.frameMs ?? 0, anchor: CPU.strike }; },
  });
  return piece;
}

export default createCpu;
