import * as THREE from 'three';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import { SIDE, myTurn } from '../../world/turn';
import type { PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import { trueDarks } from '../../world/tone';
import type { Anchor, StruckPiece } from '../../world/struck';
import { placeGlint } from '../../world/glint';
import { FRAME_H, RF, buildReflector, dishAxis, type ReflectorModel } from './model';

// The copper reflector on its arm, fixed to the page's ground as to a wall. The stream falls onto the middle of its
// face and is bounced away to the right. It does not move: the cursor's light crosses it, and the stream lights it.

const FOV = 16;
// The camera looks straight at the wall, at the middle of the dish's face, from far enough that the host's height
// frames FRAME_H millimetres of the world there.
const DIST = FRAME_H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));
// The cursor's light. It stands on a sphere round the dish, out in front, at an angle from straight ahead that grows
// with how far the cursor is from the dish on the screen, in widths and heights of the screen, and eases toward its
// largest as the cursor nears the screen's edge. So a sweep of the cursor across the whole screen carries the light
// from one side of the dish to the other, whether the host is the whole screen or a small part of it. Near the dish
// the light would sit by the bowl's centre of curvature and light the whole face at once; out here its highlight is a
// place on the face that travels with the cursor.
const LAMP = { reach: 2000, x: 50, y: 26, ease: [0.32, 0.5] as const, power: 0.62 };
// Where the glint on the tube and the knuckle takes the lamp to be: the same sphere, swung further and sooner, so the
// line runs the whole length of the tube across the part of the screen the pointer is in. Only the glint reads it: the
// dish, the wall and the arm are lit by the lamp itself.
const GLINT_LAMP = { x: 54, y: 36, ease: [0.3, 0.42] as const };
// How far the brightest of the cursor's light on the wall leans toward the cursor, and how far it may go.
const WALL_LEAN = 0.3, WALL_REACH = 110;
// How far the face's normals are turned toward the visitor for the direct lights, and how much its curve is deepened
// for them (model.ts, bendDirect).
const BEND = 6;
const CURVE = 1.7;
// The room's lights on the arm, in millimetres, and their strengths.
const ROOM = [{ at: [-900, 700, 1100] as const, k: 0.55 }, { at: [-150, 900, 60] as const, k: 0.9 }];
// The stream on the face: its light's strength, the strike's flash and the ring of light that runs out from it.
const STREAM = { light: 0.13, flash: 0.2, spill: 0.26, end: 1.6 };
// Where the stream's light lies on the face: along the line from where the stream comes from (straight above) to where it
// leaves (to the right, falling 4 degrees), laid on the face. As the dish gives, the fans swing this many times its turn.
const FAN = { from: [0, 1, 0] as const, to: [Math.cos((-4 * Math.PI) / 180), Math.sin((-4 * Math.PI) / 180), 0] as const, swing: 5 };
// The knock: the dish gives on its ball head, struck from above, as a weight on a stiff joint does. Its largest turn in
// degrees before the decay, how fast it rings, and how fast that dies. About the middle of the face, which stays put.
const KNOCK = { deg: 2.4, hz: 9, decay: 0.09 };

const restCamera = (aspect: number) => {
  const cam = new THREE.PerspectiveCamera(FOV, aspect, (DIST - 900) * RF.SCALE, (DIST + 900) * RF.SCALE);
  const d = new THREE.Vector3(...RF.D).multiplyScalar(RF.SCALE);
  cam.position.set(d.x, d.y, d.z + DIST * RF.SCALE);
  cam.lookAt(d);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
};

// Where a point of the model (millimetres) is drawn in the host: across and down from its middle, in host heights.
export function anchorOf(p: THREE.Vector3): Anchor {
  const v = p.clone().multiplyScalar(RF.SCALE).project(restCamera(1));
  return [v.x / 2, -v.y / 2];
}

// How the face looks on the screen: the angle of the line square to it, above level, and how deep its ellipse is
// against its width. Both measured by projecting the model's own points through the camera at rest.
export function faceOnScreen(): { angle: number; depth: number } {
  const n = dishAxis(), c = new THREE.Vector3(...RF.D);
  const a = anchorOf(c), b = anchorOf(c.clone().addScaledVector(n, 1));
  const angle = (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
  const u = new THREE.Vector3(0, 0, 1).cross(n).normalize(), w = n.clone().cross(u).normalize();
  const rim = c.clone().addScaledVector(n, RF.DEPTH);
  let long = 0, short = Infinity;
  for (let i = 0; i < 360; i++) {
    const t = (i / 360) * Math.PI * 2;
    const p1 = anchorOf(rim.clone().addScaledVector(u, Math.cos(t) * RF.FACE).addScaledVector(w, Math.sin(t) * RF.FACE));
    const p2 = anchorOf(rim.clone().addScaledVector(u, -Math.cos(t) * RF.FACE).addScaledVector(w, -Math.sin(t) * RF.FACE));
    const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
    long = Math.max(long, d); short = Math.min(short, d);
  }
  return { angle, depth: short / long };
}

export const REFLECTOR: { strike: Anchor } = { strike: anchorOf(new THREE.Vector3(...RF.D)) };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function createReflector(): StruckPiece {
  let stage: Stage | null = null;
  let model: ReflectorModel | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let off: (() => void) | null = null;
  let ro: ResizeObserver | null = null;
  let io: IntersectionObserver | null = null;
  let visible = true;
  let dirty = true;
  let lampUV = { x: 0.78, y: 0.22 };
  let stream = { on: 0, since: 60 };
  let held: { on: number; since: number } | null = null;
  let view: { az: number; el: number; d: number } | null = null;
  let reduced = false;
  let shown = '';
  let streamLight: THREE.PointLight | null = null;
  let drawn = 0;


  const place = () => {
    if (!stage || !model) return;
    const cam = stage.camera;
    const d = model.centre.clone().multiplyScalar(RF.SCALE);
    if (view) {
      const a = (view.az * Math.PI) / 180, e = (view.el * Math.PI) / 180;
      cam.position.set(d.x + view.d * Math.cos(e) * Math.sin(a), d.y + view.d * Math.sin(e), d.z + view.d * Math.cos(e) * Math.cos(a));
      cam.near = Math.max(0.01, view.d * 0.3); cam.far = view.d + 3;
    } else {
      cam.position.set(d.x, d.y, d.z + DIST * RF.SCALE);
      cam.near = (DIST - 900) * RF.SCALE; cam.far = (DIST + 900) * RF.SCALE;
    }
    cam.lookAt(d);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
  };

  const placeLamp = () => {
    if (!stage || !model) return;
    const dx = ((lampUV.x - 0.5) * stage.width) / Math.max(1, clock.view.w);
    const dy = ((0.5 - lampUV.y) * stage.height) / Math.max(1, clock.view.h);
    const centre = model.centre;
    const on = (l: { x: number; y: number; ease: readonly [number, number] }) => {
      const ax = Math.tanh(dx / l.ease[0]) * l.x * (Math.PI / 180), ay = Math.tanh(dy / l.ease[1]) * l.y * (Math.PI / 180);
      return new THREE.Vector3(Math.sin(ax) * Math.cos(ay), Math.sin(ay), Math.cos(ax) * Math.cos(ay)).multiplyScalar(LAMP.reach).add(centre);
    };
    const p = on(LAMP);
    stage.lamp.position.copy(p).multiplyScalar(RF.SCALE);
    placeGlint(model.glint, on(GLINT_LAMP).multiplyScalar(RF.SCALE), stage.camera);
    const w = model.wall.position;
    model.face.uLampD.value.copy(p).applyMatrix4(new THREE.Matrix4().copy(model.dish.matrix).invert()).normalize();
    model.wallC.value.set(clamp((p.x - w.x) * WALL_LEAN, -WALL_REACH, WALL_REACH), clamp((p.y - w.y) * WALL_LEAN, -WALL_REACH, WALL_REACH));
  };

  // The face's normals turned toward the visitor for the direct lights, and the visitor's direction across the face.
  const bend = () => {
    if (!stage || !model) return;
    const cam = stage.camera;
    const nView = dishAxis().applyQuaternion(model.dish.quaternion.clone().multiply(qRest.clone().invert())).transformDirection(cam.matrixWorldInverse);
    const goal = nView.clone().add(new THREE.Vector3(0, 0, BEND)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(nView, goal);
    model.face.uBend.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
    model.face.uAxisV.value.copy(nView);
    model.face.uGoal.value.copy(goal);
    model.face.uCurve.value = CURVE;
    const inv = new THREE.Matrix4().copy(model.dish.matrix).invert();
    const lc = cam.position.clone().multiplyScalar(1 / RF.SCALE).applyMatrix4(inv);
    model.face.uView.value.set(lc.x, lc.z).normalize();
  };

  // What the stream does to the face at this moment: how much it is on, the flash at the strike, and the ring of light
  // running out along the spinning rings.
  const still = () => reduced || stage?.tier === 'static';
  const streamState = () => {
    const s = held ?? stream;
    const t = s.since;
    const struck = t >= 0 && t < STREAM.end && !still();
    const flash = struck ? Math.min(1, t / 0.035) * Math.exp(-Math.max(0, t - 0.035) / STREAM.flash) : 0;
    const spill = struck ? Math.min(1, t / 0.05) * Math.exp(-t / STREAM.spill) : 0;
    const nod = struck ? KNOCK.deg * (Math.PI / 180) * Math.exp(-t / KNOCK.decay) * Math.sin(Math.PI * 2 * KNOCK.hz * t) : 0;
    return { on: s.on, flash, spill, nod };
  };

  // The dish turned by the knock about the middle of its face, the upper bar turned about the knuckle just enough to
  // keep the ball in its clamp, and the chain carried between them.
  const qRest = new THREE.Quaternion();
  const fanRest = new THREE.Vector2(1, 0);
  const knockAxis = new THREE.Vector3();
  const tmp = { q: new THREE.Quaternion(), q2: new THREE.Quaternion(), v: new THREE.Vector3(), w: new THREE.Vector3() };
  const knock = (nod: number) => {
    if (!model) return;
    const { dish, upper, chain } = model, k = model.knock, D = model.centre;
    const q = tmp.q.setFromAxisAngle(knockAxis, nod);
    dish.quaternion.copy(q).multiply(qRest);
    dish.updateMatrix();
    const ball = tmp.v.copy(k.ball).sub(D).applyQuaternion(q).add(D).sub(k.ball);
    const lever = tmp.w.copy(k.axis).cross(k.ball.clone().sub(k.knuckle));
    const turn = ball.dot(lever) / lever.lengthSq();
    const qu = tmp.q2.setFromAxisAngle(k.axis, turn);
    upper.quaternion.copy(qu);
    upper.position.copy(k.knuckle).sub(k.knuckle.clone().applyQuaternion(qu));
    const top = k.chainTop.clone().sub(D).applyQuaternion(q).add(D);
    const foot = k.chainFoot.clone().sub(k.knuckle).applyQuaternion(qu).add(k.knuckle);
    const qc = new THREE.Quaternion().setFromUnitVectors(k.chainTop.clone().sub(k.chainFoot).normalize(), top.sub(foot).normalize());
    chain.quaternion.copy(qc);
    chain.position.copy(foot).sub(k.chainFoot.clone().applyQuaternion(qc));
  };

  const apply = () => {
    if (!stage || !model) return;
    const s = streamState();
    knock(s.nod);
    place();
    placeLamp();
    bend();
    model.face.uOn.value = s.on;
    model.face.uFlash.value = s.flash;
    model.face.uSpill.value = s.spill;
    model.face.uFan.value.copy(fanRest).rotateAround(new THREE.Vector2(), s.nod * FAN.swing);
    if (streamLight) streamLight.intensity = STREAM.light * (s.on + s.flash * 1.6);
    stage.hideForClay(model.root);
  };

  // A key of everything the frame shows, so a frame is drawn only when one of them changed.
  const key = () => {
    const s = streamState();
    const r = (v: number) => Math.round(v * 1000);
    return [r(lampUV.x), r(lampUV.y), r(s.on), r(s.flash), r(s.spill), Math.round(s.nod * 1e5), view ? `${view.az},${view.el},${view.d}` : '', stage?.width, stage?.height].join('|');
  };

  const frame = (force = false) => {
    if (!stage || !visible) return;
    if (!force && !myTurn(SIDE.small)) return;
    const k = key();
    if (!force && !dirty && k === shown) return;
    if (stage.tier === 'static' && !force && !dirty && shown && !clock.isFrozen()) return;
    apply();
    stage.render();
    drawn++;
    shown = k;
    dirty = false;
  };

  const piece: StruckPiece = {
    async mount(h: HTMLElement, opts: PieceOptions) {
      reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      const fade = 'linear-gradient(to right, transparent, #000 9%, #000 91%, transparent), linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent)';
      canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;-webkit-mask-image:${fade};mask-image:${fade};-webkit-mask-composite:source-in;mask-composite:intersect`;
      h.appendChild(canvas);
      await Promise.all(['700 20px "Sora Variable"', '600 20px "JetBrains Mono Variable"'].map((f) => document.fonts.load(f).catch(() => null)));
      const centre = new THREE.Vector3(...RF.D).multiplyScalar(RF.SCALE);
      stage = new Stage(h, canvas, { tier: opts.tier, fov: FOV, near: 2, far: 5, env: 'studio', envIntensity: 0.45, bloom: { strength: 0.16, threshold: 1.4, radius: 0.3 }, ao: 0.014, aoIntensity: 0.9, lampTarget: [centre.x, centre.y, centre.z], lampAngle: 0.62 });
      trueDarks(stage.renderer);
      stage.lamp.color.set(hex('pale'));
      stage.lamp.intensity = LAMP.power;
      stage.lamp.decay = 0;
      stage.lamp.penumbra = 0.9;
      stage.lamp.shadow.radius = 7;
      stage.lamp.shadow.bias = -0.0006;
      stage.lamp.shadow.normalBias = 0.002;
      stage.lamp.shadow.camera.near = 0.6;
      stage.lamp.shadow.camera.far = 4.5;
      model = await buildReflector();
      qRest.copy(model.dish.quaternion);
      knockAxis.set(dishAxis().z, 0, -dishAxis().x).normalize();
      {
        const n = dishAxis(), f = new THREE.Vector3(...FAN.to).sub(new THREE.Vector3(...FAN.from));
        f.addScaledVector(n, -f.dot(n)).applyQuaternion(qRest.clone().invert());
        fanRest.set(f.x, f.z).normalize();
      }
      stage.wireEdges = 14;
      stage.wireDensity = 0.6;
      const s = stage.scene;
      s.add(model.root);
      const keyL = new THREE.DirectionalLight(hex('pale'), 0.12);
      keyL.position.set(-0.6, 1.0, 0.9);
      keyL.target.position.copy(centre);
      streamLight = new THREE.PointLight(hex('flame'), 0, 0.9, 2);
      streamLight.position.copy(new THREE.Vector3(...RF.D).addScaledVector(dishAxis(), 70).add(new THREE.Vector3(0, 90, 0)).multiplyScalar(RF.SCALE));
      s.add(keyL, keyL.target, streamLight, new THREE.HemisphereLight(hex('ember'), 0x070403, 0.25));
      // The room's own light on the arm and the socket: a soft lamp up and to the left in front, and a rim from above and
      // behind that draws their outlines against the dark ground. Point lights, which the dish's face leaves out.
      for (const r of ROOM) {
        const l = new THREE.PointLight(hex('pale'), r.k, 0, 0);
        l.position.set(r.at[0], r.at[1], r.at[2]).multiplyScalar(RF.SCALE);
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
    setStream(on, since) { stream = { on: clamp(on, 0, 1), since }; },
    setMaking(on) { if (stage && model) stage.setMaking(on, model.root); frame(true); },
    setTier(tier: Tier) { stage?.setTier(tier); frame(true); },
    freeze() { frame(true); },
    view(az, el, dist) { view = { az, el, d: dist }; frame(true); },
    dispose() {
      off?.(); ro?.disconnect(); io?.disconnect();
      stage?.dispose(); canvas?.remove();
      stage = null; model = null; canvas = null; streamLight = null;
    },
  };
  Object.assign(piece, {
    // Holds the stream at this state whatever the page hands over, for stills and filmstrips. null lets it go.
    hold(on: number | null, since = 60) { held = on === null ? null : { on, since }; frame(true); },
    clay(on: boolean) { if (stage && model) stage.setClay(on, model.root); frame(true); },
    rest() { view = null; frame(true); },
    stats() { return stage ? { triangles: stage.renderer.info.render.triangles, calls: stage.renderer.info.render.calls, frameMs: stage.frameMs, built: model?.tris ?? 0, drawn } : null; },
    // Where the middle of the face is drawn, as an anchor, at a moment of the knock: since seconds after a strike.
    strikeAt(since: number) {
      if (!model) return null;
      const t = since, nod = KNOCK.deg * (Math.PI / 180) * Math.exp(-t / KNOCK.decay) * Math.sin(Math.PI * 2 * KNOCK.hz * t);
      knock(nod);
      model.root.updateMatrixWorld(true);
      const p = new THREE.Vector3().setFromMatrixPosition(model.dish.matrixWorld).multiplyScalar(1 / RF.SCALE);
      const out = { nodDeg: (nod * 180) / Math.PI, anchor: anchorOf(p) };
      frame(true);
      return out;
    },
    measure() { return { strike: REFLECTOR.strike, face: faceOnScreen(), frameH: FRAME_H }; },
  });
  return piece;
}

export default createReflector;
