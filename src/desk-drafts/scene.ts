import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { COLORS, type Tier } from '../config/site';
import { hex } from '../config/palette';
import { buildBench } from '../pieces/workbench/model';
import { clock } from '../world/clock';
import { Stage } from '../world/stage';
import { BAY, DESK, EDGE, KINDS, LAND, PLACES, buildDesk, buildPC, type Kind } from './desks';
import { materials } from './materials';

// The stage the three rough desks are shown on: one desk at a time, the things on it borrowed from the carried
// workbench as stand ins, the PC under the far end, and the desk's own lights. The view is the one the fuller draft
// of Skills is drawn from: from the front left and above.

const D2R = Math.PI / 180, M = DESK.SCALE;
export const REST = { az: -24, el: 30 };
const AIM = new THREE.Vector3(0.02, -0.23, 0);
const FOV = 20;
let areaLib = false;

export interface DeskScene {
  show(kind: Kind): void;
  // A line of light along the front edge, standing in for the stream.
  stream(on: boolean): void;
  // The cursor's light, as places across and down the host, 0 to 1.
  lamp(x: number, y: number): void;
  // Turn the view by these degrees from where it rests. null puts it back.
  turn(az: number | null, el?: number): void;
  dispose(): void;
}

export async function mountDesks(host: HTMLElement, tier: Tier, first: Kind): Promise<DeskScene> {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(canvas);
  if (!areaLib) { RectAreaLightUniformsLib.init(); areaLib = true; }
  const stage = new Stage(host, canvas, { tier, fov: FOV, near: 0.2, far: 40, bloom: { strength: 0.16, threshold: 1.9, radius: 0.3 }, ao: 0.02, aoIntensity: 1, envIntensity: 0.3, env: 'studio', lampTarget: [0, -0.05, 0.1], lampAngle: 0.9 });
  const s = stage.scene;
  s.background = new THREE.Color(COLORS.bg);
  s.fog = new THREE.Fog(COLORS.bg, 6, 11);

  const mats = materials();
  const root = new THREE.Group();
  root.scale.setScalar(M);
  s.add(root);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), mats.floor);
  floor.position.y = -DESK.H;
  floor.receiveShadow = true;
  floor.userData.noWire = true;
  root.add(floor);
  const desks = new Map<Kind, THREE.Group>();
  for (const k of KINDS) { const g = buildDesk(k.id, mats); g.visible = k.id === first; root.add(g); desks.set(k.id, g); }
  root.add(buildPC(mats));

  // The things on the desk are the carried workbench's, moved to their places on a longer top.
  const bench = await buildBench();
  for (const tl of bench.tools) {
    const to = PLACES[tl.name];
    if (!to) continue;
    bench.root.remove(tl.group);
    tl.group.position.set(to[0], 0, to[1]);
    tl.group.rotation.set(0, to[2] * D2R, 0);
    root.add(tl.group);
  }
  bench.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  bench.lampBulb.color.setRGB(1, 0.82, 0.63).multiplyScalar(2.4);
  for (const m of bench.screens) m.emissiveIntensity = m.name === 'tabletScreen' ? 0.32 : 0.55;

  // The desk's own lights: the lamp over the tablet, the monitor, and the PC's ember under the far end.
  const [lx, lz] = PLACES.lamp, [mx, mz] = PLACES.monitor;
  const deskLamp = new THREE.SpotLight(0xffc98f, 5.5, 0, 58 * D2R, 0.85, 2);
  deskLamp.position.set((lx + 190) * M, 438 * M, (lz + 196) * M);
  deskLamp.target.position.set((lx + 430) * M, 0, (lz + 330) * M);
  deskLamp.castShadow = true;
  deskLamp.shadow.mapSize.set(2048, 2048);
  deskLamp.shadow.bias = -0.0006;
  deskLamp.shadow.normalBias = 0.004;
  deskLamp.shadow.radius = 5;
  deskLamp.shadow.camera.near = 0.05;
  deskLamp.shadow.camera.far = 3;
  const monLight = new THREE.RectAreaLight(0xffc48a, 3.4, 0.704, 0.396);
  monLight.position.set(mx * M, 345 * M, (mz + 15) * M);
  monLight.lookAt(mx * M, 150 * M, (mz + 525) * M);
  const pcLight = new THREE.PointLight(hex('flame'), 0.35, 1.6, 2);
  pcLight.position.set((BAY.l - 60) * M, (-DESK.H + 300) * M, ((BAY.back + BAY.front) / 2) * M);
  const rim = new THREE.RectAreaLight(0xffe0c4, 8, 2.6, 0.6);
  rim.position.set(1.4, 1.2, -1.8);
  rim.lookAt(0, -0.1, 0);
  const fill = new THREE.RectAreaLight(0xffd9b8, 8, 2.6, 1.4);
  fill.position.set(-1.6, 0.9, 2.4);
  fill.lookAt(0, -0.3, 0);
  s.add(deskLamp, deskLamp.target, monLight, pcLight, rim, fill, new THREE.HemisphereLight(0x4a3526, 0x120c08, 0.55));

  // The stream's stand in: a line that comes down onto the front edge, runs it to the near end and falls away, with a
  // long low light beside it so the edge and the timber show what the stream's light does to them.
  const line = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex('hot')).multiplyScalar(2.6) });
  const streams = new Map<Kind, THREE.Group>();
  for (const k of KINDS) {
    const [y, z] = EDGE[k.id], end = -DESK.W / 2 - (k.id === 'rail' ? 150 : 0);
    const path = new THREE.CurvePath<THREE.Vector3>();
    const v = (x: number, yy: number, zz = z) => new THREE.Vector3(x, yy, zz);
    path.add(new THREE.LineCurve3(v(LAND, 1500), v(LAND, y + 8)));
    path.add(new THREE.QuadraticBezierCurve3(v(LAND, y + 8), v(LAND, y), v(LAND - 10, y)));
    path.add(new THREE.LineCurve3(v(LAND - 10, y), v(end + 20, y)));
    path.add(new THREE.QuadraticBezierCurve3(v(end + 20, y), v(end - 70, y, z + 10), v(end - 110, y - 160, z + 40)));
    path.add(new THREE.LineCurve3(v(end - 110, y - 160, z + 40), v(end - 190, -DESK.H, z + 110)));
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 240, 3.2, 8), line);
    tube.userData.noAO = true;
    g.add(tube);
    g.scale.setScalar(M);
    // A light's size is not scaled with what holds it, so the light is placed in metres.
    const glow = new THREE.RectAreaLight(hex('flame'), 2.6, (LAND - end) * M, 0.05);
    glow.position.set(((LAND + end) / 2) * M, (y + 14) * M, (z + 12) * M);
    glow.lookAt(((LAND + end) / 2) * M, (y - 60) * M, (z - 300) * M);
    const lit = new THREE.Group();
    lit.add(g, glow);
    lit.visible = false;
    s.add(lit);
    streams.set(k.id, lit);
  }

  let view = { ...REST }, lampUV = { x: 0.62, y: 0.3 }, alive = true, seen = true, shown = first, flowing = false;
  const right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3();
  const place = () => {
    const a = view.az * D2R, e = view.el * D2R;
    const asp = stage.width / Math.max(1, stage.height), half = Math.tan((FOV / 2) * D2R);
    // Far enough back for the whole desk, its lamp and its legs, whatever the host's shape.
    const d = Math.max(1.46 / (half * asp), 1.02 / half);
    stage.camera.position.set(AIM.x + d * Math.cos(e) * Math.sin(a), AIM.y + d * Math.sin(e), AIM.z + d * Math.cos(e) * Math.cos(a));
    stage.camera.lookAt(AIM);
    stage.camera.updateMatrixWorld(true);
    stage.camera.matrixWorld.extractBasis(right, up, back);
    stage.lamp.position.copy(AIM).addScaledVector(right, (lampUV.x - 0.5) * 2.8).addScaledVector(up, (0.5 - lampUV.y) * 1.5 + 0.35).addScaledVector(back, 1.25);
    stage.lamp.intensity = 16;
  };
  // Under a held clock, which is how a still is taken, a frame is drawn only when something has changed.
  let stale = true;
  const frame = () => {
    if (!alive || !seen) return;
    if (clock.isFrozen() && !stale) return;
    stale = false;
    const t = clock.now();
    bench.monitor.draw(t);
    bench.tablet.draw(t);
    place();
    stage.render();
  };
  stage.resize();
  place();
  for (const g of desks.values()) g.visible = true;
  await stage.warm();
  for (const [k, g] of desks) g.visible = k === first;
  const watch = new ResizeObserver(() => { stage.resize(); stale = true; frame(); });
  watch.observe(host);
  const near = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); });
  near.observe(host);
  const off = clock.onFrame(frame);
  frame();

  return {
    show(kind) { shown = kind; for (const [k, g] of desks) g.visible = k === kind; for (const [k, g] of streams) g.visible = flowing && k === kind; stale = true; frame(); },
    stream(on) { flowing = on; for (const [k, g] of streams) g.visible = on && k === shown; stale = true; frame(); },
    lamp(x, y) { if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) > 0.002) stale = true; lampUV = { x, y }; },
    turn(az, el = 0) { view = az === null ? { ...REST } : { az: REST.az + az, el: Math.min(62, Math.max(6, REST.el + el)) }; stale = true; frame(); },
    dispose() { alive = false; off(); watch.disconnect(); near.disconnect(); stage.dispose(); canvas.remove(); },
  };
}
