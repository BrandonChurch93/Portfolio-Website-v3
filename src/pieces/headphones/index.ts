import * as THREE from 'three';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import type { Piece, PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import { trueDarks } from '../../world/tone';
import type { Anchor } from '../../world/struck';
import { BEAR, FRAME_H, HP, MID_Y, buildHeadphones, type HeadphonesModel } from './model';

// The headphones on their hook by the Skills title, fixed to the page's ground as to a wall. They do not turn with the
// cursor: its light crosses them. The page swings them as a pendulum about the point where the band bears on the
// hook, and the cups lag a little behind the band on their pivots. The stream never touches them.

const FOV = 16;
// The camera looks straight at the wall, at the middle of the whole thing, from far enough that the host's height
// frames FRAME_H millimetres of the world at the depth the band hangs at.
const DIST = FRAME_H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));
const AIM = new THREE.Vector3(0, MID_Y, BEAR.z);
// The cursor's light, as the reflector's: on a sphere round the pair, out in front, at an angle from straight ahead
// that grows with how far the cursor is from the pair on the screen and eases toward its largest at the screen's edge.
const LAMP = { reach: 2000, x: 64, y: 30, ease: [0.32, 0.5] as const, power: 3.4 };
// How far the shadow's brightest place on the wall leans away from the cursor's light, and how far it may go.
const WALL_LEAN = 0.05, WALL_REACH = 60;
// The room's lights on the metal, in millimetres from the bearing point, and their strengths: a soft lamp up and to
// the left in front, a rim from above, a light low at the left, and one behind the pair that draws the canopy's and
// the cushions' edges against the dark ground.
const ROOM = [{ at: [-900, 700, 1100] as const, k: 0.9 }, { at: [250, 900, 40] as const, k: 1.3 }, { at: [-1300, 250, 60] as const, k: 0.8 }, { at: [0, 420, -260] as const, k: 1.8 }];
// The cups' lag behind the band, in radians against the band's angle and its speed in radians a second.
const LAG = { angle: 0.22, speed: 0.06, most: 0.12 };

const restCamera = (aspect: number) => {
  const cam = new THREE.PerspectiveCamera(FOV, aspect, (DIST - 900) * HP.SCALE, (DIST + 900) * HP.SCALE);
  const d = AIM.clone().multiplyScalar(HP.SCALE);
  cam.position.set(d.x, d.y, d.z + DIST * HP.SCALE);
  cam.lookAt(d);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
};

// Where a point of the model (millimetres, in the world) is drawn in the host: across and down from its middle, in
// host heights.
export function anchorOf(p: THREE.Vector3): Anchor {
  const v = p.clone().multiplyScalar(HP.SCALE).project(restCamera(1));
  return [v.x / 2, -v.y / 2];
}

// Where the band bears on the hook: the page puts the host by it.
export const HEADPHONES: { hook: Anchor } = { hook: anchorOf(BEAR) };

export interface Swing {
  // The angle the pair hangs at, in radians from straight down, about the point where the band bears on the hook.
  // speed, in radians a second, may be handed over with it; otherwise it is worked out from the angles handed over.
  setSwing(angle: number, speed?: number): void;
}
export type HeadphonesPiece = Piece & Swing;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function createHeadphones(): HeadphonesPiece {
  let stage: Stage | null = null;
  let model: HeadphonesModel | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let off: (() => void) | null = null;
  let ro: ResizeObserver | null = null;
  let io: IntersectionObserver | null = null;
  let visible = true;
  let dirty = true;
  let lampUV = { x: 0.78, y: 0.22 };
  let view: { az: number; el: number; d: number } | null = null;
  let shown = '';
  let drawn = 0;
  const swing = { a: 0, v: 0, at: null as number | null };

  const lag = () => clamp(-(LAG.angle * swing.a + LAG.speed * swing.v), -LAG.most, LAG.most);

  const place = () => {
    if (!stage) return;
    const cam = stage.camera;
    const d = AIM.clone().multiplyScalar(HP.SCALE);
    if (view) {
      const a = (view.az * Math.PI) / 180, e = (view.el * Math.PI) / 180;
      cam.position.set(d.x + view.d * Math.cos(e) * Math.sin(a), d.y + view.d * Math.sin(e), d.z + view.d * Math.cos(e) * Math.cos(a));
      cam.near = Math.max(0.01, view.d * 0.3); cam.far = view.d + 3;
    } else {
      cam.position.set(d.x, d.y, d.z + DIST * HP.SCALE);
      cam.near = (DIST - 900) * HP.SCALE; cam.far = (DIST + 900) * HP.SCALE;
    }
    cam.lookAt(d);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
  };

  const placeLamp = () => {
    if (!stage || !model) return;
    const dx = ((lampUV.x - 0.5) * stage.width) / Math.max(1, clock.view.w);
    const dy = ((0.5 - lampUV.y) * stage.height) / Math.max(1, clock.view.h);
    const ax = Math.tanh(dx / LAMP.ease[0]) * LAMP.x * (Math.PI / 180), ay = Math.tanh(dy / LAMP.ease[1]) * LAMP.y * (Math.PI / 180);
    const p = new THREE.Vector3(Math.sin(ax) * Math.cos(ay), Math.sin(ay), Math.cos(ax) * Math.cos(ay)).multiplyScalar(LAMP.reach).add(AIM);
    stage.lamp.position.copy(p).multiplyScalar(HP.SCALE);
    model.look.uLampW.value.copy(stage.lamp.position);
    model.wallC.value.set(clamp(-(p.x - AIM.x) * WALL_LEAN, -WALL_REACH, WALL_REACH), MID_Y + clamp(-(p.y - AIM.y) * WALL_LEAN, -WALL_REACH, WALL_REACH));
  };

  const apply = () => {
    if (!stage || !model) return;
    model.swing.rotation.z = swing.a;
    const l = lag();
    for (const c of model.cups) c.rotation.z = l;
    place();
    placeLamp();
    stage.hideForClay(model.root);
  };

  const key = () => {
    const r = (v: number) => Math.round(v * 1000);
    return [r(lampUV.x), r(lampUV.y), Math.round(swing.a * 1e5), Math.round(lag() * 1e5), view ? `${view.az},${view.el},${view.d}` : '', stage?.width, stage?.height].join('|');
  };

  const frame = (force = false) => {
    if (!stage || !visible) return;
    const k = key();
    if (!force && !dirty && k === shown) return;
    if (stage.tier === 'static' && !force && !dirty && shown && !clock.isFrozen()) return;
    apply();
    stage.render();
    drawn++;
    shown = k;
    dirty = false;
  };

  const piece: HeadphonesPiece = {
    async mount(h: HTMLElement, opts: PieceOptions) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      const fade = 'linear-gradient(to right, transparent, #000 9%, #000 91%, transparent), linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent)';
      canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;-webkit-mask-image:${fade};mask-image:${fade};-webkit-mask-composite:source-in;mask-composite:intersect`;
      h.appendChild(canvas);
      const aim = AIM.clone().multiplyScalar(HP.SCALE);
      stage = new Stage(h, canvas, { tier: opts.tier, fov: FOV, near: 2, far: 5, env: 'studio', envIntensity: 0.3, bloom: { strength: 0.14, threshold: 1.4, radius: 0.3 }, ao: 0.01, aoIntensity: 0.9, lampTarget: [aim.x, aim.y, aim.z], lampAngle: 0.32 });
      trueDarks(stage.renderer);
      stage.lamp.color.set(hex('pale'));
      stage.lamp.intensity = LAMP.power;
      stage.lamp.decay = 0;
      stage.lamp.penumbra = 0.4;
      stage.lamp.shadow.radius = 6;
      stage.lamp.shadow.bias = -0.0005;
      stage.lamp.shadow.normalBias = 0.0015;
      stage.lamp.shadow.camera.near = 1.2;
      stage.lamp.shadow.camera.far = 3.2;
      model = await buildHeadphones();
      stage.wireEdges = 14;
      stage.wireDensity = 0.6;
      const s = stage.scene;
      s.add(model.root);
      const keyL = new THREE.DirectionalLight(hex('pale'), 0.12);
      keyL.position.set(-0.6, 1.0, 0.9);
      keyL.target.position.copy(aim);
      s.add(keyL, keyL.target, new THREE.HemisphereLight(hex('ember'), 0x070403, 0.08));
      for (const r of ROOM) {
        const l = new THREE.PointLight(hex('pale'), r.k, 0, 0);
        l.position.set(r.at[0], r.at[1], r.at[2]).add(BEAR).multiplyScalar(HP.SCALE);
        s.add(l);
      }
      stage.resize();
      apply();
      await stage.warm();
      stage.render();
      shown = key();
      dirty = false;
      ro = new ResizeObserver(() => { stage?.resize(); frame(true); });
      ro.observe(h);
      io = new IntersectionObserver((es) => { const was = visible; visible = es.some((e) => e.isIntersecting); if (visible && !was) frame(true); });
      io.observe(h);
      off = clock.onFrame(() => frame());
      opts.onReady?.();
    },
    setLamp(x, y) { lampUV = { x, y }; },
    setProgress() {},
    setWaterLight() {},
    setSwing(angle, speed) {
      const t = clock.now();
      if (speed !== undefined) swing.v = speed;
      else if (swing.at !== null && t > swing.at) swing.v = (angle - swing.a) / (t - swing.at);
      else if (angle === swing.a) swing.v = 0;
      swing.a = angle;
      swing.at = t;
    },
    setMaking(on) { if (stage && model) stage.setMaking(on, model.root); frame(true); },
    setTier(tier: Tier) { stage?.setTier(tier); frame(true); },
    freeze() { frame(true); },
    view(az, el, dist) { view = { az, el, d: dist }; frame(true); },
    dispose() {
      off?.(); ro?.disconnect(); io?.disconnect();
      stage?.dispose(); canvas?.remove();
      stage = null; model = null; canvas = null;
    },
  };
  Object.assign(piece, {
    clay(on: boolean) { if (stage && model) stage.setClay(on, model.root); frame(true); },
    rest() { view = null; frame(true); },
    redraw() { frame(true); },
    stats() { return stage ? { triangles: stage.renderer.info.render.triangles, calls: stage.renderer.info.render.calls, frameMs: stage.frameMs, built: model?.tris ?? 0, drawn, programs: stage.renderer.info.programs?.length ?? 0 } : null; },
    measure() {
      // The bearing point again, measured through the stage's own camera at the host's real aspect, beside the export.
      const out: Record<string, unknown> = { hook: HEADPHONES.hook, frameH: FRAME_H, bearZ: BEAR.z };
      if (stage) {
        const was = view; view = null; place();
        const v = BEAR.clone().multiplyScalar(HP.SCALE).project(stage.camera);
        out.live = [(v.x / 2) * stage.camera.aspect, -v.y / 2];
        view = was; place();
      }
      return out;
    },
  });
  return piece;
}

export default createHeadphones;
